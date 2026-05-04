import { WebSocketGateway } from '@nestjs/websockets';
import { WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  namespace: 'chat'
})

export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server; //! initalised by nestJS not me
    constructor(private chatService: ChatService) {}

    async handleConnection(client: Socket) {
    console.log(`Client connecté: ${client.id}`);
    } 

    handleDisconnect(client: Socket) {
    console.log(`Client déconnecté: ${client.id}`);
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(client: Socket, payload: { channelId: number; content: string }) {
    console.log(`Message reçu: ${payload.content}`);
    }
}