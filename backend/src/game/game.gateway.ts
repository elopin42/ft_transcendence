import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  players = new Map<string, { pseudo: string; x: number; y: number }>();

  handleConnection(client: any) {
    const pseudo = client.handshake.query.pseudo || 'Anon';
    this.players.set(client.id, { pseudo, x: 0, y: 0 });
    console.log('Joueurs connectés :', Array.from(this.players.values()));
    this.server.emit('players', Array.from(this.players.values()));
  }

  handleDisconnect(client: any) {
    if (this.players.has(client.id)) {
      this.players.delete(client.id);
      this.server.emit('players', Array.from(this.players.values()));
    }
  }

  @SubscribeMessage('move')
  handleMove(client: any, payload: { x: number; y: number }) {
    const player = this.players.get(client.id);
    if (player) {
      player.x = payload.x;
      player.y = payload.y;
      this.server.emit('players', Array.from(this.players.values()));
    }
  }
}
