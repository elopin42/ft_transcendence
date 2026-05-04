import { Global, Module } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

// Module global : PrismaService est dispo partout sans qu'on ait a l'importer dans chaque module qui en a besoin.
// Pattern recommande par la doc Prisma + Nest (singleton, 1 seul pool de connexions DB pour toute l'app).
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule { }
