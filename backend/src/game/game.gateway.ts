import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';

// @WebSocketGateway()
// export class GameGateway {
//   @SubscribeMessage('message')
//   handleMessage(client: any, payload: any): string {
//     return 'Hello world!';
//   }
// }

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    players = new Map<string, { pseudo: string, x: number, y: number }>();

    handleConnection(client: any, ...args: any[]) {
        const pseudo = client.handshake.query.pseudo || 'Anon';

        this.players.set(client.id, { pseudo, x: 0, y: 0 });

        client.join();

        console.log('Joueurs connectés:', Array.from(this.players.values()));
        this.server.emit('players', Array.from(this.players.values()));
    }

    handleDisconnect(client: any) {
        const joueur = this.players.get(client.id);
        if (joueur) {
            this.players.delete(client.id);
            this.server.emit('players', Array.from(this.players.values()));
        }
    }
}
