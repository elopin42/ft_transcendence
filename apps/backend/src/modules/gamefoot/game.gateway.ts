import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { PrismaService } from '@/common/prisma/prisma.service';
import { TokenService } from '@/modules/auth/services/token.service';
import { UsersService } from '@/modules/users/services/users.service';


interface Player {
  id: string; // socketId
  pnumber: number;
  pseudo: string;
  x: number;
  y: number;
  scale: number;
  win: number;
}
interface ballon {
  x: number;
  y: number;
  vx: number;
  vy: number;
  start: boolean;
  finish: boolean;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'https://localhost', // fallback HTTPS car nginx gère le SSL
    credentials: true
  },
  namespace: 'gamefoot'
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger('GameFootGateway');

  @WebSocketServer()
  server!: Server; // évité que typescript mette une erreur sait que ce sera initialisé

  constructor(
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
    private prisma: PrismaService,
  ) { }

  // en gros une sorte de tableau ou une room contient 2 player 
  rooms = new Map<number, { bal: ballon; player1: Player | null; player2: Player | null; interval?: any }>();
  clientRoom = new Map<string, number>(); // socketId -> roomId

  private getAvailableRoomId(): number {
    let i = 1;
    while (this.rooms.has(i)) i++;
    return i; // retourne la first room avaible
  }

  async handleConnection(client: any) {
    // Le cookie d'auth s'appelle access_token (cf. cookie.helper.ts).
    const cookie = client.handshake.headers.cookie;
    const token = cookie?.split(';')
      .find((c: string) => c.trim().startsWith('access_token='))
      ?.split('=')[1];

    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = await this.tokenService.verify(token);
      const user = await this.usersService.findById(payload.sub);
      if (!user) throw new WsException('User not found');
      const login = user.login;
      this.logger.log(`Player connected: ${login} (client ${client.id})`);
      let roomId: number | null = null;
      for (const [id, room] of this.rooms) {
        if (room.player2 === null) { roomId = id; break; }
      };
      if (roomId === null) {
        // si aucune room attent un joeur on cree
        roomId = this.getAvailableRoomId();
        this.rooms.set(roomId, { bal: { x: 1340, y: 690, vx: 10, vy: 6, start: false, finish: false }, player1: { id: client.id, pnumber: 1, pseudo: login, x: 0, y: 0, scale: 0, win: 0 }, player2: null });
      } else {
        // sinon join
        const existing = this.rooms.get(roomId);
        if (!existing) return;
        if (existing.bal.finish) return;
        existing.player2 = { id: client.id, pnumber: 2, pseudo: login, x: 0, y: 0, scale: 0, win: 0 };
      }
      this.clientRoom.set(client.id, roomId);
      client.join(roomId.toString());
      const room = this.rooms.get(roomId)!;
      this.server.to(roomId.toString()).emit('players', {
        players: [room.player1, room.player2].filter(p => p !== null),
        bal: room.bal
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'auth failed';
      this.logger.warn(`Player disconnected during auth: ${message}`);
      client.emit('error', { message });
      client.disconnect();
    }
  }

  handleDisconnect(client: any) {
    const roomId = this.clientRoom.get(client.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId)!;
    // supprimer le joueur de la room
    if (room.player1?.id === client.id) room.player1 = null;
    else room.player2 = null;
    this.clientRoom.delete(client.id);
    if (!room.player1 && !room.player2) {
      this.rooms.delete(roomId);
      this.clientRoom.delete(client.id);
      return;
    }
    this.server.to(roomId.toString()).emit('players', {
      players: [room.player1, room.player2].filter(p => p !== null),
      bal: room.bal
    });
  }

  @SubscribeMessage('move')
  handleMove(client: any, payload: { x: number; y: number; scale: number }) {
    // Valider le payload (par exemple, vérifier que x et y sont des nombres)
    if (typeof payload?.x !== 'number' || typeof payload?.y !== 'number') return;
    const roomId = this.clientRoom.get(client.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId!)!;
    if (!room) return;
    if (room.player1 && room.player1?.id === client.id) {
      room.player1.x = payload.x;
      room.player1.y = payload.y;
      room.player1.scale = payload.scale;
      this.server.to(roomId.toString()).emit('players', {
        players: [room.player1, room.player2].filter(p => p !== null),
        bal: room.bal
      });
    } else if (room.player2 && room.player2?.id === client.id) {
      room.player2.x = payload.x;
      room.player2.y = payload.y;
      room.player2.scale = payload.scale;
      this.server.to(roomId.toString()).emit('players', {
        players: [room.player1, room.player2].filter(p => p !== null),
        bal: room.bal
      });
    }
  }
  @SubscribeMessage('start')
  handlestart(client: any) {
    const roomId = this.clientRoom.get(client.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId!)!;
    if (!room) return;
    this.logger.debug(`Match start requested in room ${roomId}`);
    if (room.bal.start || room.bal.finish) return;
    room.bal.start = true;
    room.interval = setInterval(() => {
      if (room.player1 && room.player2) {
        room.bal.x += room.bal.vx;
        room.bal.y += room.bal.vy;
        // console.log(room.bal.x);
        // console.log(room.bal.y);
        const player1Bottom = room.player1.y + (2412 / 2) * room.player1.scale;
        const player2Bottom = room.player2.y + (2412 / 2) * room.player2.scale;
        if (room.bal.y <= 410 || room.bal.y >= 1480) room.bal.vy *= -1;
        if ((room.bal.y <= player1Bottom && room.bal.y >= player1Bottom - 100) && (room.bal.x <= room.player1.x + 50 && room.bal.x >= room.player1.x - 50)) room.bal.vx *= -1;
        else if ((room.bal.y <= player2Bottom && room.bal.y >= player2Bottom - 100) && (room.bal.x <= room.player2.x + 50 && room.bal.x >= room.player2.x - 50)) room.bal.vx *= -1;
        else if ((room.bal.x <= 50 || room.bal.x >= 2680) || (room.player1.win >= 5 || room.player2.win >= 5)) {
          if (room.bal.x <= 50) room.player1.pnumber == 2 ? room.player1.win++ : room.player2.win++;
          else if (room.bal.x >= 2680) room.player2.pnumber == 1 ? room.player2.win++ : room.player1.win++;
          else if (room.player1.win >= 5 || room.player2.win >= 5) {
            const login = room.player1.win == 5 ? room.player1.pseudo : room.player2.pseudo;
            this.prisma.user.update({
              where: { login },
              data: { points: { increment: 1 } }
            }).catch(e => this.logger.error(`Failed to update winner points: ${e?.message ?? e}`, e?.stack));
            room.bal.finish = true;
          }
          room.bal.x = 1340;
          room.bal.y = 690;
          room.bal.start = false;
          clearInterval(room.interval);
          room.interval = null;
          return;
        }
        this.server.to(roomId.toString()).emit('players', {
          players: [room.player1, room.player2].filter(p => p !== null),
          bal: { x: room.bal.x, y: room.bal.y }
        });
      }
      else {
        this.logger.debug(`Room ${roomId} waiting for second player`);
           if (room.interval) {
          clearInterval(room.interval);
          room.interval = null;
        }
        room.bal.start = false;
      }
    }, 16);
  }
}
