import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: 'postgresql://user:password@db:5432/transcendence',
    //a changer avec le .env!!!!!
  },
});
