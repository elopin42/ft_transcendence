import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guard qui declenche la strategy '42' (redirect vers intra ou traite le callback).
// Pas de logique custom : on herite simplement d'AuthGuard avec le nom de la strategy.
@Injectable()
export class FortyTwoAuthGuard extends AuthGuard('42') { }