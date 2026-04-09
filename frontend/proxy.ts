import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/', '/login', '/register'];

export async function proxy(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    const path = req.nextUrl.pathname;
    const isPublic = PUBLIC_ROUTES.some(route => path === route);

    let valid = false;
    if (token) {
        try {
            const res = await fetch('/api/auth/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            valid = res.ok;
        } catch {
            valid = false;
        }
    }

    if (!valid && !isPublic) {
        return NextResponse.redirect(new URL('/login', req.url));
    }
    // if (valid && isPublic && path !== '/') {
    //     return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
}
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.css$|.*\\.js$).*)',
  ],
};
