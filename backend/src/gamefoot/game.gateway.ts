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
  }
  interface ballon {
    x: number;
    y: number;
    vx: number;
    vy: number;
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
            this.rooms.set(roomId, { bal: {x: 0, y:0, vx: 5, vy:3}, player1: {id: client.id, pnumber: 1, pseudo: login, x: 0, y: 0 }, player2: null });
          } else {
            // sinon join
            this.rooms.get(roomId)!.player2 = {id: client.id, pnumber: 2, pseudo: login, x: 0, y: 0 };
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
    this.server.to(roomId.toString()).emit('players', {
       players: [room.player1, room.player2].filter(p => p !== null),
            bal: room.bal
    });
  }

  @SubscribeMessage('move')
  handleMove(client: any, payload: { x: number; y: number }) {
    // Valider le payload (par exemple, vérifier que x et y sont des nombres)
    if (typeof payload?.x !== 'number' || typeof payload?.y !== 'number') return;
    const roomId = this.clientRoom.get(client.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId!)!;
    if (!room) return;
    if (room.player1 && room.player1?.id === client.id) {
        room.player1.x = payload.x;
        room.player1.y = payload.y;
        this.server.to(roomId.toString()).emit('players', {
            players: [room.player1, room.player2].filter(p => p !== null),
            bal: room.bal
        });
    } else if (room.player2 && room.player2?.id === client.id) {
        room.player2.x = payload.x;
        room.player2.y = payload.y;
        this.server.to(roomId.toString()).emit('players', {
            players: [room.player1, room.player2].filter(p => p !== null),
            bal: room.bal
        });
    }
  }
      @SubscribeMessage('start')
      handleMove(client: any) {
      const roomId = this.clientRoom.get(client.id);
      if (!roomId) return;
      const interval = setInterval(() => {
        const room = this.rooms.get(roomId!)!;
        if (!room) return;
        if (room.player1 && room.player2) {
          room.bal.x += bal.vx;
          room.bal.y += bal.vy;
          if (bal.y <= 0 || bal.y >= 1150) bal.vy *= -1;
          if (bal.x <= 0 || bal.x >= 2680) bal.vx *= -1;
          this.server.to(roomId.toString()).emit('players', {
             players: [room.player1, room.player2].filter(p => p !== null),
             bal: { x: bal.x, y: bal.y}
          });
        }
        else {
        console.log("manque joueur");
        }
      }, 16);

  }
}
