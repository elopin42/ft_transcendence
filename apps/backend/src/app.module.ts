import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from '@/app.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { LoggingModule } from '@/logging/logging.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { UsersModule } from '@/modules/users/users.module';
import { GameModule } from '@/modules/game/game.module';
import { GameFootModule } from '@/modules/gamefoot/game.module';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { ConditionalThrottlerGuard } from '@/common/guards/conditional-throttler.guard';
import { validateEnv } from '@/common/config/env.config';

// Module racine. Compose les modules transverses (Config, Throttler, Prisma, Logging)
// puis les modules metier (Auth, Users, Game, GameFoot).
//
// Throttler global : 3 buckets s'appliquent en meme temps. Le plus restrictif
// qui deborde renvoie 429. Bypass complet via THROTTLER_DISABLED=true (dev/tests).
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, cache: true }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },     // anti-rafale
      { name: 'medium', ttl: 10000, limit: 50 },   // usage normal intensif
      { name: 'long', ttl: 60000, limit: 200 },    // anti-abus soutenu
    ]),
    PrismaModule,
    LoggingModule,
    AuthModule,
    UsersModule,
    GameModule,
    GameFootModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ConditionalThrottlerGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule { }
