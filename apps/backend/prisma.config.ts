import "dotenv/config";
// rajouté env pour lire les variables d'environnement de manière type-safe et lance une erreur si manque pluotot que undefined
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"), // env lu par la cli de prisma
  },
});
