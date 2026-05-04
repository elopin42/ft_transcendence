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
  isAI: boolean;
}

interface ballon {
  x: number;
  y: number;
  vx: number;
  vy: number;
  start: boolean;
  finish: boolean;
}

interface Room {
  bal: ballon;
  player1: Player | null;
  player2: Player | null;
  interval?: any;
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

  readonly playerY: number = 660;
  readonly playerX1: number = 330;
  readonly playerX2: number = 2400;

  constructor(
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
    private prisma: PrismaService,
  ) { }

  // en gros une sorte de tableau ou une room contient 2 player 
  rooms = new Map<number, Room>();
  clientRoom = new Map<string, number>(); // socketId -> roomId

  private getAvailableRoomId(): number {
    let i = 1;
    while (this.rooms.has(i)) i++;
    return i; // retourne la first room avaible
  }

  private getRoomAndRoomId(clientId: string): [Room | null, number | null] {
    const roomId = this.clientRoom.get(clientId);
    if (!roomId)
      return [null, null];
    const room = this.rooms.get(roomId);
    if (!room)
      return [null, roomId];
    return [room, roomId];
  }

  /**
   * @brief Replace a null player by a bot in the given room
   * @return True if the bot have been successfully added to the room else false
   */
  private addBotToRoom(room: Room, roomId: number): boolean {
    let pnumber: number;
    
    if (!room.player1)
      pnumber = 1;
    else if (!room.player2)
      pnumber = 2;
    else
      return false;
    const startX = pnumber === 1 ? this.playerX1 : this.playerX2;
    const newPlayer: Player = {
      id: 'AI_' + roomId,
      pnumber: pnumber,
      pseudo: 'AI',
      x: startX,
      y: this.playerY,
      scale: 0.15 + ((this.playerY - 280) / (1150 - 280)) * (0.35 - 0.15), // même formule que le frontend pour le scale
      win: 0,
      isAI: true,
    };
    if (pnumber === 1) room.player1 = newPlayer;
    else room.player2 = newPlayer;
    return true;
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
        this.rooms.set(roomId, {
          bal: { x: 1340, y: 690, vx: 10, vy: 6, start: false, finish: false },
          player1: { id: client.id, pnumber: 1, pseudo: login, x: this.playerX1, y: this.playerY, scale: 0, win: 0, isAI: false },
          player2: null,
        });
      } else {
        // sinon join
        const existing = this.rooms.get(roomId);
        if (!existing || existing.bal.finish) return;
        existing.player2 = { id: client.id, pnumber: 2, pseudo: login, x: this.playerX2, y: this.playerY, scale: 0, win: 0, isAI: false };
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

  /**
   * @brief Handles client disconnection and replace that client by a 
   * bot if the room is not empty (Julien : bot IA)
   */
  handleDisconnect(client: any) {
    const [room, roomId] = this.getRoomAndRoomId(client.id);
    if (!room || !roomId) return;
    // supprimer le joueur de la room
    if (room.player1?.id === client.id) room.player1 = null;
    else room.player2 = null;
    this.clientRoom.delete(client.id);
    if (!room.player1 && !room.player2) {
      this.rooms.delete(roomId);
      return;
    }
    this.addBotToRoom(room, roomId);
    this.server.to(roomId.toString()).emit('players', {
      players: [room.player1, room.player2].filter(p => p !== null),
      bal: room.bal
    });
  }

  @SubscribeMessage('move')
  handleMove(client: any, payload: { x: number; y: number; scale: number }) {
    if (typeof payload?.x !== 'number' || typeof payload?.y !== 'number') return;
    const [room, roomId] = this.getRoomAndRoomId(client.id);
    if (!room || !roomId) return;
    const updatePlayer = (player: Player) => {
      player.x = payload.x;
      player.y = payload.y;
      player.scale = payload.scale;
      this.server.to(roomId.toString()).emit('players', {
        players: [room.player1, room.player2].filter(p => p !== null),
        bal: room.bal
      });
    };
    if (room.player1 && room.player1.id === client.id) updatePlayer(room.player1);
    else if (room.player2 && room.player2.id === client.id) updatePlayer(room.player2);
  }

  // Mode 2 joueurs sur le meme ecran (Ethan)
  @SubscribeMessage('move2')
  handleMove2(client: any, payload: { x: number; y: number; scale: number }) {
    if (typeof payload?.x !== 'number' || typeof payload?.y !== 'number') return;
    const [room, roomId] = this.getRoomAndRoomId(client.id);
    if (!room || !roomId) return;
    const updatePlayer = (player: Player) => {
      player.x = payload.x;
      player.y = payload.y;
      player.scale = payload.scale;
      this.server.to(roomId.toString()).emit('players', {
        players: [room.player1, room.player2].filter(p => p !== null),
        bal: room.bal
      });
    };
    if (room.player2 && room.player1 && room.player2.id === client.id) updatePlayer(room.player1);
    else if (room.player1 && room.player2 && room.player1.id === client.id) updatePlayer(room.player2);
  }

  private moveAI(room: Room) {
    const ai = room.player1?.isAI ? room.player1 : (room.player2?.isAI ? room.player2 : null);
    if (!ai)
      return;

    const bal = room.bal;
    const isPlayer1 = ai.pnumber === 1;
    const ballHeadingToAI = isPlayer1 ? bal.vx < 0 : bal.vx > 0;
    let targetY: number;

    if (ballHeadingToAI) {
      const distX = Math.abs(bal.x - ai.x);
      const timeToReach = distX / Math.abs(bal.vx);
      let predictedY = bal.y + bal.vy * timeToReach;

      const imprecision = 0;
      // [-0.5, 0.5] * imprecision
      predictedY += (Math.random() - 0.5) * imprecision;
      targetY = Math.max(410, Math.min(1480, predictedY));
    } else {
      targetY = (this.playerY + (2412 / 2) * ai.scale) + 50;
    }

    const footY = ai.y + (2412 / 2) * ai.scale;
    // Vitesse identique au player dans le front
    const speed = 3 + ((ai.y - 225) / (1150 - 225)) * (7 - 3);
    const diff = targetY - footY;
    if (Math.abs(diff) > speed)
      ai.y += speed * Math.sign(diff);
    ai.y = Math.max(225, Math.min(1150, ai.y));
    // Recalcul du scale (même formule que le frontend)
    ai.scale = 0.15 + ((ai.y - 280) / (1150 - 280)) * (0.35 - 0.15);
  }

  /**
   * @brief Start the game.
   * If the player is alone, add a bot as second player (Julien)
   */
  @SubscribeMessage('start')
  handlestart(client: any) {
    const [room, roomId] = this.getRoomAndRoomId(client.id);
    if (!room || !roomId) return;
    this.logger.debug(`Match start requested in room ${roomId}`);
    if (room.bal.start || room.bal.finish) return;
    room.bal.start = true;
    // Si il manque un joueur on ajoute un bot pour combler
    if ((!room.player1 && room.player2) || (room.player1 && !room.player2))
      this.addBotToRoom(room, roomId);
    room.interval = setInterval(() => {
      if (room.player1 && room.player2) {
        room.bal.x += room.bal.vx;
        room.bal.y += room.bal.vy;
        this.moveAI(room);
        const shouldBallBounce = (ball: ballon, player: Player): boolean => {
          // pour detecter le pied du joueur
          const playerFoot = player.y + (2412 / 2) * player.scale;
          return (ball.y <= playerFoot && ball.y >= playerFoot - 100)
            && (ball.x <= player.x + 50 && ball.x >= player.x - 50);
        };
        if (room.bal.y <= 410 || room.bal.y >= 1480)
          room.bal.vy *= -1; // rebondit sur les murs haut et bas
        if (shouldBallBounce(room.bal, room.player1))
          room.bal.vx = Math.abs(room.bal.vx);
        else if (shouldBallBounce(room.bal, room.player2))
          room.bal.vx = -Math.abs(room.bal.vx);
        else if ((room.bal.x <= 50 || room.bal.x >= 2680) || (room.player1.win >= 5 || room.player2.win >= 5)) {
          if (room.bal.x <= 50)
            room.player1.pnumber == 2 ? room.player1.win++ : room.player2.win++; // +1 win pour le joueur qui marque
          else if (room.bal.x >= 2680)
            room.player2.pnumber == 1 ? room.player2.win++ : room.player1.win++;
          // si un joueur a gagne 5 fois, fin du match
          if (room.player1.win >= 5 || room.player2.win >= 5) {
            // On envoie a la DB QUE si le gagnant n est PAS un bot AI
            if ((room.player1.win >= 5 && !room.player1.isAI) || (room.player2.win >= 5 && !room.player2.isAI)) {
              const login = room.player1.win >= 5 ? room.player1.pseudo : room.player2.pseudo;
              this.prisma.user.update({
                where: { login },
                data: { points: { increment: 1 } }
              }).catch(e => this.logger.error(`Failed to update winner points: ${e?.message ?? e}`, e?.stack));
            }
            room.bal.finish = true;
          }
          room.bal.x = 1340;
          room.bal.y = 690;
          room.bal.start = false;
          // Reset Y des deux joueurs au point marque (Julien)
          room.player1.y = this.playerY;
          room.player2.y = this.playerY;
          clearInterval(room.interval);
          room.interval = null;
        }
        this.server.to(roomId.toString()).emit('players', {
          players: [room.player1, room.player2].filter(p => p !== null),
          bal: { x: room.bal.x, y: room.bal.y }
        });
      } else {
        // Avec le bot ce cas ne devrait plus arriver, mais on garde le clean au cas ou
        if (room.interval) {
          clearInterval(room.interval);
          room.interval = null;
        }
        room.bal.start = false;
      }
    }, 16);
  }
}
