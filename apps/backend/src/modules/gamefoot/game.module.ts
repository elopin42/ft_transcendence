import { Module } from '@nestjs/common';

import { GameGateway } from '@/modules/gamefoot/game.gateway';
import { AuthModule } from '@/modules/auth/auth.module';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { UsersModule } from '@/modules/users/users.module';

@Module({
	imports: [AuthModule, PrismaModule, UsersModule],
	providers: [GameGateway],
})
export class GameFootModule {}
