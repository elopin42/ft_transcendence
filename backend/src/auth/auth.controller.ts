import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  
  @Post('register')
  async register(@Body() dto: RegisterDto) { // ajout du registerDto pour bénéficier de la validation automatique des données d'entrée grâce au ValidationPipe global défini dans main.ts
    return this.authService.register(dto.email, dto.password);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) { // ajout du loginDto
    return this.authService.login(dto.email, dto.password);
  }
}
