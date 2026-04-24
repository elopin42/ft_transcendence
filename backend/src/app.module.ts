import { AuthMiddleware } from './auth/auth.middleware';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { GameModule } from './game/game.module';
import { GameFootModule } from './gamefoot/game.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    PrismaModule,
    GameModule,
    GameFootModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude( // route accecible sans JWT
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/logout', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST }, // pour plus tard
        { path: 'auth/me', method: RequestMethod.GET }, // le controller gere l'auth lui-meme
        { path: 'auth/42', method: RequestMethod.GET }, // autorise l'accès à la route de redirection vers 42 sans token pour permettre le login via 42
        { path: 'auth/42/status', method: RequestMethod.GET }, // autorise l'accès à la route de vérification du statut 42 sans token
        { path: 'auth/42/callback', method: RequestMethod.GET }, // autorise l'accès au callback de 42 sans token pour permettre le traitement du callback après login via 42
      )
      .forRoutes('*');
  }
}
