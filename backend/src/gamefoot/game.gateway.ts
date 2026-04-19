import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';
import {  } from '@nestjs/websockets';


  interface Player {
    id: string; // socketId
    pnumber: number;
    pseudo: string;
    x: number;
    y: number;
    scale: number;
  }
  interface ballon {
    x: number;
    y: number;
    vx: number;
    vy: number;
    start: boolean;
  }

@WebSocketGateway({
    cors: {
        origin: process.env.CORS_ORIGIN || 'https://localhost', // fallback HTTPS car nginx gère le SSL
        credentials: true
    },
    namespace: 'gamefoot'
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server; // évité que typescript mette une erreur sait que ce sera initialisé

  constructor(
      private authService: AuthService
  ) {}

  // en gros une sorte de tableau ou une room contient 2 player 
  rooms = new Map<number, { bal: ballon; player1: Player | null; player2: Player | null }>();
  clientRoom = new Map<string, number>(); // socketId → roomId

  private getAvailableRoomId(): number {
    let i = 1;
    while (this.rooms.has(i)) i++;
    return i; // retourne la first room avaible
  }

  async handleConnection(client: any) {
     const cookie = client.handshake.headers.cookie;
     console.log(cookie);
     const token = cookie?.split(';')
         .find((c: string) => c.trim().startsWith('token='))
         ?.split('=')[1];

       if (!token) {
           client.disconnect();
           return;
       }
       try {
          const login = await this.authService.gamelogin(token);
          console.log(login);
          let roomId: number | null = null;
          for (const [id, room] of this.rooms) {
            if (room.player2 === null) { roomId = id; break; }
          };
          if (roomId === null) {
            // si aucune room attent un joeur on cree
            roomId = this.getAvailableRoomId();
            this.rooms.set(roomId, { bal: {x: 1340, y:690, vx: 10, vy:6, start:false}, player1: {id: client.id, pnumber: 1, pseudo: login, x: 0, y: 0, scale: 0 }, player2: null });
          } else {
            // sinon join
            this.rooms.get(roomId)!.player2 = {id: client.id, pnumber: 2, pseudo: login, x: 0, y: 0, scale: 0 };
          }
          this.clientRoom.set(client.id, roomId);
          client.join(roomId.toString());
          const room = this.rooms.get(roomId)!;
          this.server.to(roomId.toString()).emit('players', {
            players: [room.player1, room.player2].filter(p => p !== null),
            bal: room.bal
          });
          console.log("connect");
      } catch (error) {
          console.log("disconnect");
          console.log(error);
          client.emit('error', { message: error.message});
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
  handleMove(client: any, payload: { x: number; y: number; scale: number}) {
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
      console.log("start");
      const roomId = this.clientRoom.get(client.id);
      if (!roomId) return;
      const room = this.rooms.get(roomId!)!;
      if (!room) return;
      console.log("start boucle");
      if (room.bal.start) return;
      room.bal.start = true;
      const interval = setInterval(() => {
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
          else if (room.bal.x <= 50 || room.bal.x >= 2680) room.bal.vx *= -1;
          this.server.to(roomId.toString()).emit('players', {
             players: [room.player1, room.player2].filter(p => p !== null),
             bal: { x: room.bal.x, y: room.bal.y}
          });
        }
        else {
        console.log("manque joueur");
        }
      }, 16);

  }
}
