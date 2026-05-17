import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { AuthModule } from '@/modules/auth/auth.module';
import { UsersModule } from '@/modules/users/users.module';

@Module({
    imports: [AuthModule, UsersModule],
    providers: [ChatGateway, ChatService],
})
export class ChatModule {}
