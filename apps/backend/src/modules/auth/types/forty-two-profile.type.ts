// Profil 42 normalise par FortyTwoStrategy a partir de la reponse de
// /v2/me. Persiste tel quel dans la table FortyTwoProfile (cf. schema
// Prisma) — separe de User pour ne pas polluer le modele applicatif.

export type FortyTwoProfile = {
    fortyTwoId: number;
    login: string;
    email: string;
    displayName: string | null;
    imageUrl: string | null;
    campus: string | null;
    poolMonth: string | null;
    poolYear: string | null;
    raw: unknown; // payload brut /v2/me (stocke en JSONB pour usage futur)
};
