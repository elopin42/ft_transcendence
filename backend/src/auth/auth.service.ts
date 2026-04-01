import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';


@Injectable()
export class AuthService {
  private readonly jwtSecret = process.env.JWT_SECRET ?? (() => {throw new Error('JWT_SECRET not set'); })();

  constructor(private prisma: PrismaService) {}

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  async generateToken(userId: number): Promise<string> {
    return jwt.sign({ userId }, this.jwtSecret, { expiresIn: '3h' });
  }

  async register(email: string, password: string): Promise<{ token: string }> {
    const hashedPassword = await this.hashPassword(password);
    const user = await this.prisma.user.create({
      data: { email, password: hashedPassword, login: email.split('@')[0], },
    });
    const token = await this.generateToken(user.id);
    return { token };
  }

  async login(email: string, password: string): Promise<{ token: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = await this.generateToken(user.id);
    return { token };
  }

  async validateToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
