import { SetMetadata } from '@nestjs/common';

// Marque une route comme publique (pas d'auth JWT requise). Lu par
// JwtAuthGuard global qui bypass quand il voit cette metadata.
//
// A utiliser sur :
//   - @Public() class    -> tout le controller est public
//   - @Public() method   -> juste cette route
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
