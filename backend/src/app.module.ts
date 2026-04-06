import { AuthMiddleware } from './auth/auth.middleware';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { GameModule } from './game/game.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    PrismaModule,
    GameModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude( // route accecible sans JWT
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/42', method: RequestMethod.GET }, // autorise l'accès à la route de redirection vers 42 sans token pour permettre le login via 42
        { path: 'auth/42/callback', method: RequestMethod.GET }, // autorise l'accès au callback de 42 sans token pour permettre le traitement du callback après login via 42
      )
      .forRoutes('*');
  }
}
