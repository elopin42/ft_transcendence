import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';

import { UsersModule } from '@/modules/users/users.module';

import { AuthController } from '@/modules/auth/controllers/auth.controller';
import { FortyTwoController } from '@/modules/auth/controllers/forty-two.controller';
import { RefreshController } from '@/modules/auth/controllers/refresh.controller';
import { TwoFactorController } from '@/modules/auth/controllers/two-factor.controller';
import { SessionsController } from '@/modules/auth/controllers/sessions.controller';

import { AuthService } from '@/modules/auth/services/auth.service';
import { PasswordService } from '@/modules/auth/services/password.service';
import { TokenService } from '@/modules/auth/services/token.service';
import { SessionService } from '@/modules/auth/services/session.service';
import { TwoFactorService } from '@/modules/auth/services/two-factor.service';

import { JwtStrategy } from '@/modules/auth/strategies/jwt.strategy';
import { FortyTwoStrategy } from '@/modules/auth/strategies/forty-two.strategy';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

import type { EnvConfig } from '@/common/config/env.config';

// Module auth : controllers, services, strategies Passport, guard global JWT.
// JwtModule est configure async pour lire le secret depuis l'env validee.
// Le JwtAuthGuard est enregistre comme APP_GUARD -> protege toutes les routes
// HTTP par defaut (bypass via @Public() sur les routes ouvertes).
@Module({
    imports: [
        UsersModule,
        PassportModule,
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService<EnvConfig, true>) => ({
                secret: config.get('JWT_SECRET', { infer: true }),
                signOptions: {
                    expiresIn: config.get('JWT_EXPIRATION', { infer: true }) ?? '3h',
                },
            }),
        }),
    ],
    controllers: [
        AuthController,
        FortyTwoController,
        RefreshController,
        TwoFactorController,
        SessionsController,
    ],
    providers: [
        AuthService,
        PasswordService,
        TokenService,
        SessionService,
        TwoFactorService,
        JwtStrategy,
        FortyTwoStrategy,
        // JwtAuthGuard appliqué globalement toute route est protégée
        // sauf si décorée avec @Public().
        { provide: APP_GUARD, useClass: JwtAuthGuard },
    ],
    exports: [
        AuthService,
        TokenService,
        SessionService,
        PasswordService,
        TwoFactorService
    ],
})
export class AuthModule { }