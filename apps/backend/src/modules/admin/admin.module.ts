import { Module } from '@nestjs/common';
import { AdminController } from '@/modules/admin/admin.controller';

// Module admin / debug panel. Squelette pour usage futur :
// stats temps reel, liste logs, gestion users, ban, etc.
@Module({
	controllers: [AdminController],
	providers: [],
	exports: [],
})
export class AdminModule {}
