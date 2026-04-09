// Étend le type Request d'Express pour inclure req.user ajouté par Passport
// permet d'etre sur des champs comme req.user.fortyTwoId sans erreur de typescript
declare namespace Express {
	interface User {
		fortyTwoId: number;
		login: string;
		email: string;
		imageUrl: string | null;
	}
}