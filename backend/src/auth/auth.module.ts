import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt'; // Importation de JWT plutot que de jsonwebtoken pour bénéficier de l'intégration avec NestJS et ainsi faciliter la gestion des tokens JWT
import { PassportModule } from '@nestjs/passport'; // Importation de PassportModule pour gérer les stratégies d'authentification (ex: la stratégie '42' pour l'authentification via 42 intra)
import { ConfigModule, ConfigService } from '@nestjs/config'; // Pour l'importation de l'env
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FortyTwoStrategy } from './strategies/forty-two.strategy'; // Importation de la stratégie d'authentification via 42 intra
import type { StringValue } from 'ms';

@Module({
  imports: [
    PrismaModule,
    PassportModule, // enregistre Passport.js dans Nestjs pour les Guards et Strategies
    JwtModule.registerAsync({ // Utilisation de registerAsync pour permettre l'injection de ConfigService et ainsi récupérer les valeurs de JWT_SECRET et JWT_EXPIRATION depuis les variables d'environnement de manière dynamique
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ // configuration de JWT avec les valeurs récupérées depuis l'env
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRATION', '3h') as StringValue,
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    FortyTwoStrategy, // enregistre la strategie dans passport sous le nom de '42'
  ],
  controllers: [AuthController],
  exports: [AuthService]
})
export class AuthModule {}
