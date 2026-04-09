import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'; // Importation des exceptions pour gérer les erreurs d'authentification et de conflit (ex: email déjà utilisé)
import { JwtService } from '@nestjs/jwt'; // importation de JwtService l'env est lu dynamique dans le module auth.module.ts grâce à JwtModule.registerAsync
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';


@Injectable()
export class AuthService {

	constructor(private prisma: PrismaService, private jwt: JwtService) { }

	async hashPassword(password: string): Promise<string> {
		const salt = await bcrypt.genSalt();
		return bcrypt.hash(password, salt);
	}

	async generateToken(userId: number): Promise<string> {
		return this.jwt.signAsync({ userId }); // pas besoin de spécifier le secret et l'expiration ici car ils sont déjà configurés dans JwtModule.registerAsync
	}

	async register(email: string, password: string): Promise<{ token: string }> {
		const hashedPassword = await this.hashPassword(password);

		// Génère le login à partir de l'email, avec suffixe si conflit
		let login = email.split('@')[0];
		const loginExists = await this.prisma.user.findUnique({ where: { login } });
		if (loginExists) { login = `${login}_${Date.now().toString(36)}`; } // génère un suffixe court et unique basé sur le timestamp ex: "john_m3k9x2"

		try { // capture l'errreur d'email
			const user = await this.prisma.user.create({
				data: {
					email,
					password: hashedPassword,
					login,
				},
			});
			const token = await this.generateToken(user.id);
			return { token };
		} catch (error: any) {
			if (error.code === 'P2002') {
				throw new ConflictException('Un compte avec cet email existe déjà');
			}
			throw error;
		}
	}

	async login(email: string, password: string): Promise<{ token: string }> {
		const user = await this.prisma.user.findUnique({ where: { email } });

		if (!user || !user.password) { // rajouté pour la 42 api qui peut retourner un user sans password evité a bcrypt de comparer avec undefined et ainsi éviter une erreur inattendue
			throw new UnauthorizedException('Invalid credentials');
		}
		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			throw new UnauthorizedException('Invalid credentials');
		}
		const token = await this.generateToken(user.id);
		return { token };
	}
	async loginWith42(profile: { fortyTwoId: number; login: string; email: string; imageUrl: string | null }): Promise<string> {
		// cherche un user avec le fortyTwoId du profil 42
		let user = await this.prisma.user.findUnique({ where: { fortyTwoId: profile.fortyTwoId } });

		// pas trouvé verifie si l'email existe déjà (cas ou l'utilisateur a déjà créé un compte avec email/mdp puis essaye de se connecter avec 42 avec le même email)
		if (!user) {
			const existingUser = await this.prisma.user.findUnique({ where: { email: profile.email } });
			// lie le compte 42 au compte existant
			if (existingUser) {
				user = await this.prisma.user.update({
					where: { id: existingUser.id },
					data: { fortyTwoId: profile.fortyTwoId }, // associe le compte 42 à l'utilisateur existant
				});
			} else {
				// creation d'un nouveau compte avec les infos du profil 42
				let login = profile.login;
				const loginExists = await this.prisma.user.findUnique({ where: { login } });
				if (loginExists) { login = `${profile.login}_42`; }

				user = await this.prisma.user.create({
					data: {
						email: profile.email,
						login,
						fortyTwoId: profile.fortyTwoId,
						password: null, // pas de mot de passe pour les comptes 42 mais on pourrais faire une page de connexion qui oblige a creer un compte normal mais lier a 42
						//imageUrl: profile.imageUrl, retirer car on utiliser une autre facon a git ethan mais existe au besoin
					},
				});
			}
		}
		// Génère un token JWT avec l'id de l'user (meme token que pour login classique)
		return this.generateToken(user.id);
	}

	async gamelogin(token: string): Promise<string> {
		try {
			const payload = await this.validateToken(token)
			const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
			if (!user) throw new UnauthorizedException('User not found');
			return (user.login);
		} catch (error) {
			throw error;
		}
	}

	async validateToken(token: string): Promise<any> {
		try {
			return await this.jwt.verifyAsync(token); // pas besoin de spécifier le secret ici car il est déjà configuré dans JwtModule.registerAsync
		} catch (error) {
			throw new UnauthorizedException('Invalid or expired token');
		}
	}

}
