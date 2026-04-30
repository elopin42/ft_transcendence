import { Module } from '@nestjs/common';

import { GameGateway } from '@/modules/game/gateways/game.gateway';
import { AuthModule } from '@/modules/auth/auth.module';
import { UsersModule } from '@/modules/users/users.module';

@Module({
	imports: [AuthModule, UsersModule],
	providers: [GameGateway],
})
export class GameModule {}
