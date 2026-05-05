import { Module } from '@nestjs/common';

import { UsersController } from '@/modules/users/controllers/users.controller';
import { UsersService } from '@/modules/users/services/users.service';

// Pattern Repository : les repositories Prisma sont declares ici. Les
// services injectent ces repos plutot que PrismaService directement.
// Cf. docs/01-ARCHITECTURE.md
import { UserRepository } from '@/modules/users/repositories/user.repository';
import { FortyTwoProfileRepository } from '@/modules/users/repositories/forty-two-profile.repository';

// Module users : CRUD utilisateurs. Pour l'instant un seul endpoint GET /users/me,
// a etendre avec PATCH /users/me, GET /users/:login, sessions actives, etc.
//
// Les repositories sont exportes pour les modules consommateurs (auth notamment)
// qui peuvent ainsi acceder aux queries User sans passer par UsersService.
// Cf. docs/01-ARCHITECTURE.md cas 2 (cross-module imports).
@Module({
    controllers: [UsersController],
    providers: [
        UsersService,
        UserRepository,
        FortyTwoProfileRepository,
    ],
    exports: [
        UsersService,
        UserRepository,
        FortyTwoProfileRepository,
    ],
})
export class UsersModule { }
