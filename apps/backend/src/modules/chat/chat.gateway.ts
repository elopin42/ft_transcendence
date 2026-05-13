import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, WsException } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { ChatService } from './chat.service';
import { TokenService } from '@/modules/auth/services/token.service';
import { UsersService } from '@/modules/users/services/users.service';

@WebSocketGateway({
    cors: {
        origin: process.env.CORS_ORIGIN || 'https://localhost',
        credentials: true,
    },
    namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(ChatGateway.name);

    @WebSocketServer()
    server!: Server;

    constructor(
        private readonly chatService: ChatService,
        private readonly tokenService: TokenService,
        private readonly usersService: UsersService,
    ) {}

    async handleConnection(client: any) {
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
            client.data.userId = user.id;
            this.logger.log(`Chat connected: ${user.login} (${client.id})`);
        } catch (error) {
            this.logger.warn(`Chat auth failed: ${(error as Error)?.message ?? error}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: any) {
        this.logger.log(`Chat disconnected: ${client.id}`);
    }

    @SubscribeMessage('createChannel')
    async handleCreateChannel(client: any, payload: { name: string; type: any; password?: string }) {
        const channel = await this.chatService.createChannel(client.data.userId, payload.name, payload.type, payload.password);
        client.join(`channel:${channel.id}`);
        return channel;
    }

    @SubscribeMessage('joinChannel')
    async handleJoinChannel(client: any, payload: { channelId: number }) {
        await this.chatService.joinChannel(client.data.userId, payload.channelId);
        client.join(`channel:${payload.channelId}`);
        return { success: true };
    }

    @SubscribeMessage('sendMessage')
    async handleSendMessage(client: any, payload: { channelId: number; content: string }) {
        const message = await this.chatService.sendMessage(client.data.userId, payload.channelId, payload.content);
        this.server.to(`channel:${payload.channelId}`).emit('newMessage', message);
        return message;
    }

    @SubscribeMessage('getMessages')
    async handleGetMessages(_client: any, payload: { channelId: number }) {
        return this.chatService.getMessages(payload.channelId);
    }
}
