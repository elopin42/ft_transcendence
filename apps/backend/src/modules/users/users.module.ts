import { Module } from '@nestjs/common';

import { UsersController } from '@/modules/users/controllers/users.controller';
import { UsersService } from '@/modules/users/services/users.service';

// Module users : CRUD utilisateurs. Pour l'instant un seul endpoint GET /users/me,
// a etendre avec PATCH /users/me, GET /users/:id, sessions actives, etc.
@Module({
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }
