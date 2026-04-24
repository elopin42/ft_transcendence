import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [GameGateway],
})
export class GameFootModule {}
