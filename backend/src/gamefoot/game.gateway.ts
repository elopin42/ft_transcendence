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

  players = new Map<string, { pnumber: number; pseudo: string; x: number; y: number }>();

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
          console.log(login)
          const usedNumbers = new Set(Array.from(this.players.values()).map(p => p.pnumber));
          let pnu: number;
          if (!usedNumbers.has(1)) pnu = 1;
          else if (!usedNumbers.has(2)) pnu = 2;
          else throw new Error('trop de joueurs dans la partie');

          this.players.set(client.id, { pnumber: pnu, pseudo: login, x: 0, y: 0 });
          this.server.emit('players', Array.from(this.players.entries()).map(([id, p]) => ({ id, ...p })));
          console.log("connect");
      } catch (error) {
          console.log("disconnect");
          console.log(error);
          client.emit('error', { message: error.message});
          client.disconnect();
      }
  }

  handleDisconnect(client: any) {
    if (this.players.has(client.id)) {
      this.players.delete(client.id);
      this.server.emit('players', Array.from(this.players.entries()).map(([id, p]) => ({ id, ...p })));
    }
  }

  @SubscribeMessage('move')
  handleMove(client: any, payload: { x: number; y: number }) {
    // Valider le payload (par exemple, vérifier que x et y sont des nombres)
    if (typeof payload?.x !== 'number' || typeof payload?.y !== 'number') return;
    const player = this.players.get(client.id);
    if (player) {
      player.x = payload.x;
      player.y = payload.y;
      this.server.emit('players', Array.from(this.players.entries()).map(([id, p]) => ({ id, ...p })));
    }
  }
}
