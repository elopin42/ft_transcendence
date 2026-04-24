import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AuthService } from '../auth/auth.service';


@WebSocketGateway({
    cors: {
        origin: process.env.CORS_ORIGIN || 'https://localhost', // fallback HTTPS car nginx gère le SSL
        credentials: true
    },
    namespace: 'world'
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server; // évité que typescript mette une erreur sait que ce sera initialisé

  constructor(
      private authService: AuthService
  ) {}

  players = new Map<string, { pseudo: string; x: number; y: number }>();

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
          this.players.set(client.id, { pseudo: login, x: 0, y: 0 });
          console.log("connect");
      } catch (error) {
          console.log("disconnect");
          console.log(error);
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
