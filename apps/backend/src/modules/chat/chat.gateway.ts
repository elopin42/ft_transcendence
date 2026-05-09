import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { ChannelType } from '@prisma/client';

@WebSocketGateway({ namespace: 'chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`Client connecté: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client déconnecté: ${client.id}`);
  }

  @SubscribeMessage('createChannel')
  async handleCreateChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { name: string; type: ChannelType; password?: string },
  ) {
    const userId = client.data.userId;
    const channel = await this.chatService.createChannel(userId, payload.name, payload.type, payload.password);
    client.join(`channel:${channel.id}`);
    return channel;
  }

  @SubscribeMessage('joinChannel')
  async handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { channelId: number },
  ) {
    const userId = client.data.userId;
    await this.chatService.joinChannel(userId, payload.channelId);
    client.join(`channel:${payload.channelId}`);
    return { success: true };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { channelId: number; content: string },
  ) {
    const userId = client.data.userId;
    const message = await this.chatService.sendMessage(userId, payload.channelId, payload.content);
    this.server.to(`channel:${payload.channelId}`).emit('newMessage', message);
    return message;
  }

  @SubscribeMessage('getMessages')
  async handleGetMessages(
    @ConnectedSocket() _client: Socket,
    @MessageBody() payload: { channelId: number },
  ) {
    return this.chatService.getMessages(payload.channelId);
  }
}