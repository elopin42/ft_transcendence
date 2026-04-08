import { NextRequest, NextResponse } from 'next/server';

// Routes publiques — tout le reste est protégé
const PUBLIC_ROUTES = ['/', '/login', '/register'];

export function proxy(req: NextRequest) {
  const token = req.cookies.get('token');
  const path = req.nextUrl.pathname;

  const isPublic = PUBLIC_ROUTES.some(route => path === route);

  // Pas connecté + route protégée → login
  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Connecté + route publique (sauf /) → dashboard
  if (token && isPublic && path !== '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.css$|.*\\.js$).*)',
  ],
};