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
import type { MovePayload, PlayerBase } from '@ftt/shared/game';
import {
    movePlayer,
    SPAWN_SCALE,
    SPAWN_X,
    SPAWN_Y
} from '@ftt/shared/game/dashboard';

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

  players = new Map<string, PlayerBase>();

  private emitPlayers() {
    this.server.emit('players', Array.from(this.players.entries()).map(([, p]) => (p)));
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
      this.players.set(client.id, {
        id: client.id,
        pseudo: login,
        x: SPAWN_X,
        y: SPAWN_Y,
        scale: SPAWN_SCALE
      });
      this.emitPlayers();
    } catch (error) {
      this.logger.warn(`Player disconnected during auth: ${(error as Error)?.message ?? error}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: any) {
    if (this.players.has(client.id)) {
      this.players.delete(client.id);
      this.emitPlayers();
    }
  }

  @SubscribeMessage('move')
  handleMove(client: any, payload: MovePayload) {
    if (typeof payload?.xVector !== 'number' || typeof payload?.yVector !== 'number') return;
    const player = this.players.get(client.id);
    if (player) {
      movePlayer(player, payload);
      this.emitPlayers();
    }
  }
}
