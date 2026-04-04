import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [GameGateway],
})
export class GameModule {}
