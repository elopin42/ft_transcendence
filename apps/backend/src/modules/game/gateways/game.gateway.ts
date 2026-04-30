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
import { TokenService } from '@/modules/auth/services/token.service';
import { UsersService } from '@/modules/users/services/users.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'https://localhost',
    credentials: true,
  },
  namespace: 'world',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(GameGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
  ) { }

  players = new Map<string, { pseudo: string; x: number; y: number }>();

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
      this.players.set(client.id, { pseudo: login, x: 0, y: 0 });
    } catch (error) {
      this.logger.warn(`Player disconnected during auth: ${(error as Error)?.message ?? error}`);
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
    if (typeof payload?.x !== 'number' || typeof payload?.y !== 'number') return;
    const player = this.players.get(client.id);
    if (player) {
      player.x = payload.x;
      player.y = payload.y;
      this.server.emit('players', Array.from(this.players.entries()).map(([id, p]) => ({ id, ...p })));
    }
  }
}
