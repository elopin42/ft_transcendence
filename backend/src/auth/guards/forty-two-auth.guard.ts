import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guard qui déclenche la stratégie '42' (redirige vers 42 ou traite le callback)
@Injectable()
export class FortyTwoAuthGuard extends AuthGuard('42') {}