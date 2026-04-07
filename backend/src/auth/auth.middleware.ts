import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private authService: AuthService) { }

  async use(req: Request, res: Response, next: NextFunction) {
    // Cherche dans le header Authorization (login email/mdp)
    const authHeader = req.headers['authorization'];
    let token: string | undefined = authHeader?.split(' ')[1];

    // Si pas de token dans le header, cherche dans les cookies (login 42)
    if (!token) { token = req.cookies?.['token']; }
    // Aucun token trouvé → 401
    if (!token) { throw new UnauthorizedException('Token is missing'); }
    
    //pas de throw authHeader si pas de header on stocke juste dans let token
    try {
      const payload = await this.authService.validateToken(token);
      req['user'] = payload;
      next();
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
