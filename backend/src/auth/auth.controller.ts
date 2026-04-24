import { Body, Controller, Get, Post, Req, Res, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { FortyTwoAuthGuard } from './guards/forty-two-auth.guard';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { parseExpiration } from '../utils/parse-expiration';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private configService: ConfigService, private prisma: PrismaService) { }

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res() res: Response) { // ajout du registerDto pour bénéficier de la validation automatique des données d'entrée grâce au ValidationPipe global défini dans main.ts
    const { token } = await this.authService.register(dto.email, dto.password, dto.login); // enregistrement de l'utilisateur et génération du token
    this.setTokenCookie(res, token); // utilisation des cookies
    res.json({ success: true });
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res() res: Response) { // ajout du loginDto
    const { token } = await this.authService.login(dto.email, dto.password); // vérification des identifiants et génération du token
    this.setTokenCookie(res, token); // utilisation des cookies
    res.json({ success: true });
  }

  @Post('logout') // route pour la déconnexion, supprime le cookie
  async logout(@Res() res: Response) {
    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/', // évite des bug possible de version 
    });
    res.json({ success: true });
  }

  // retourne les infos du user connecté a partir du cookie JWT
  // utilisé par le AuthProvider coté front pour savoir qui est connecté
  // si le token est invalide ou le user n'existe plus -> 401
  @Get('me')
  async me(@Req() req: Request, @Res() res: Response) {
    // on lit le cookie directement, pas besoin de middleware
    // c'est la meme logique que gamelogin() dans auth.service.ts
    const token = req.cookies?.token;
    if (!token) throw new UnauthorizedException('Pas de token');
    try {
      // validateToken retourne { userId } (le payload du JWT signé dans generateToken)
      const payload = await this.authService.validateToken(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, login: true, email: true, fortyTwoId: true },
      });
      if (!user) throw new UnauthorizedException('User introuvable');
      res.json(user);
    } catch {
      throw new UnauthorizedException('Token invalide');
    }
  }

  // TODO: refresh token - route préparée mais pas encore implémentée
  @Post('refresh')
  async refresh(@Req() _req: Request, @Res() res: Response) {
    // lire le refresh token depuis le cookie
    // vérifier qu'il est valide
    // générer un nouveau access token
    // retourner le nouveau token dans le cookie
    res.status(501).json({ message: 'Not implemented yet' });
  }


  // route pour la connexion 42 redirect https://api.intra.42.fr/oauth/authorize
  @Get('42')
  @UseGuards(FortyTwoAuthGuard) // déclenche la redirection vers 42
  fortyTwoLogin() { /*le guard gère la redirection */ }

  @Get('42/status') // verifie si l'api est configuré pour afficher ou non le bouton de login 42 sur le frontend ou une erreur personalisé
  fortyTwoStatus() {
    const UID42 = this.configService.get<string>('FORTYTWO_CLIENT_ID') || '';
    return { available: !!(UID42 && UID42 !== 'disabled') };
  }

  // route apres 42 appelle validate() qui appelle /v2/me, et met le profil dans req.user
  @Get('42/callback')
  @UseGuards(FortyTwoAuthGuard) // traite le callback de 42, req.user contient les infos du profil 42
  async fortyTwoCallback(@Req() req: Request, @Res() res: Response) {
    // verifie que req.user existe bien, sinon échec de l'authentification via 42
    if (!req.user) throw new UnauthorizedException('42 auth failed');
    // récuperation de validate() { fortyTwoId, login, email, imageUrl }
    const token = await this.authService.loginWith42(req.user);

    this.setTokenCookie(res, token); // utilisation des cookies pour stocker le token

    const frontendUrl = this.configService.get<string>('CORS_ORIGIN', 'https://localhost'); // fallback HTTPS car nginx gère le SSL
    // TODO: utiliser la locale du user quand elle sera en db
    res.redirect(`${frontendUrl}/dashboard`); // redirection vers le frontend après login 42, à adapter selon la route d'accueil du frontend
  }

  // helper privé pour éviter la duplication du code cookie
  // httpOnly = pas accessible en JS côté client (protection XSS)
  // sameSite lax = envoyé sur navigation top-level (nécessaire pour redirect 42)
  // pour debug les cookies : DevTools > Application > Cookies (visible même en httpOnly)
  // NE PAS passer httpOnly en false pour debug — ça retire la protection XSS
  private setTokenCookie(res: Response, token: string) {
    res.cookie('token', token, {
      httpOnly: true,
      secure: true, // toujours sécurisé avec nginx en hhttps, et en dev on peut se permettre de forcer le secure pour éviter les erreurs de cookies non sécurisés
      sameSite: 'lax',
      path: '/', // évite des bug possible de version 
      maxAge: parseExpiration(this.configService.get<string>('JWT_EXPIRATION', '3h')),
    });
  }
}
