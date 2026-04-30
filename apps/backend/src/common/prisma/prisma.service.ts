import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Wrapper Nest autour de PrismaClient. Etend PrismaClient -> usage direct
// `this.prisma.user.findUnique(...)` dans tous les services.

// Prisma 7 impose un adapter explicit. PrismaPg lit DATABASE_URL via process.env
// (ConfigService ne peut pas etre injecte ici parce que PrismaService est cree avant que ConfigModule soit pret).
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });
    super({ adapter });
  }

  // Connexion explicite a la DB au boot (Nest appelle onModuleInit
  // automatiquement). Sans ca, Prisma se connecte de maniere lazy a la 1ere query.
  async onModuleInit() {
    await this.$connect();
  }
}