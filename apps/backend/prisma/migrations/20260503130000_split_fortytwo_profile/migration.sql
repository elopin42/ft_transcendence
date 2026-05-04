-- Sépare le profil 42 du modele User dans sa propre table.
-- Migration sans perte : on copie l'eventuel User.fortyTwoId existant vers
-- FortyTwoProfile avant de supprimer la colonne.

-- 1. Crée la table dédiée
CREATE TABLE "FortyTwoProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "fortyTwoId" INTEGER NOT NULL,
    "login" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "imageUrl" TEXT,
    "campus" TEXT,
    "poolMonth" TEXT,
    "poolYear" TEXT,
    "raw" JSONB,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FortyTwoProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FortyTwoProfile_userId_key" ON "FortyTwoProfile"("userId");
CREATE UNIQUE INDEX "FortyTwoProfile_fortyTwoId_key" ON "FortyTwoProfile"("fortyTwoId");
CREATE UNIQUE INDEX "FortyTwoProfile_login_key" ON "FortyTwoProfile"("login");

ALTER TABLE "FortyTwoProfile"
    ADD CONSTRAINT "FortyTwoProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Migre les comptes 42 deja lies (s'il y en a)
INSERT INTO "FortyTwoProfile" ("userId", "fortyTwoId", "login")
SELECT "id", "fortyTwoId", "login"
FROM "User"
WHERE "fortyTwoId" IS NOT NULL;

-- 3. Supprime la colonne fortyTwoId du User (et son index unique)
DROP INDEX IF EXISTS "User_fortyTwoId_key";
ALTER TABLE "User" DROP COLUMN IF EXISTS "fortyTwoId";

-- 4. User.title decouple du titre 42 (sera pose par le user, pas par 42)
-- Pas de modification de structure ici, juste de la documentation.
