import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose'; // compatible edge + node runtime
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/config/routing';
import { locales, defaultLocale } from '@/config/i18n';
import { ROUTES, ROUTES_PUBLIC } from '@/config/routes';

// regex dynamique — genere /(fr|en|...) a partir du tableau locales
// pas de hardcode, si on rajoute une langue ca marche automatiquement
const localePrefix = new RegExp(`^/(${locales.join('|')})(/|$)`);

// next-intl gere la detection de langue et les redirections de locale
const intlMiddleware = createMiddleware(routing);

// TODO récuperer isPrivate depuis le config/routes.ts pour dire si '/' est accecible ou privé
// idée decide si le tableau de routes publique est publique ou privé permet de décidé le style de site 

export async function proxy(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    const path = req.nextUrl.pathname;

    // verifie si l'url commence par une locale valide (/fr/... ou /en/...)
    const hasLocale = localePrefix.test(path);

    //  CAS A : Redirection si locale manquante
    // Si l'utilisateur tape /dashboard, on le force vers /fr/dashboard
    if (!hasLocale && path !== '/') {
        const locale = req.cookies.get('NEXT_LOCALE')?.value || defaultLocale;
        return NextResponse.redirect(new URL(`/${locale}${path}`, req.url));
    }

    // retire la locale du path pour comparer avec les routes publiques
    // /fr/auth -> /auth, /en/dashboard -> /dashboard, /fr -> /
    const pathWithoutLocale = hasLocale
        ? path.replace(localePrefix, '/').replace(/^\/$/, '/') || '/'
        : path;

    // la landing (/) est toujours publique meme pour les users connectés
    const isPublic = pathWithoutLocale === '/' || ROUTES_PUBLIC.some(route => pathWithoutLocale === route);

    // verification locale du JWT (signature + expiration) sans appel reseau
    // jose verifie en ~0.1ms vs fetch vers le backend en ~10-50ms
    let valid = false;
    if (token) {
        try {
            const secret = new TextEncoder().encode(process.env.JWT_SECRET);
            await jwtVerify(token, secret);
            valid = true;
        } catch {
            // token invalide ou expiré
            // TODO: refresh token - si le token est expiré mais qu'on a un refresh token
            valid = false;
        }
    }

    // --- LOGIQUE DE REDIRECTION ---

    // CAS B : Non connecté tente d'aller sur une route privée
    if (!valid && !isPublic) {
        const locale = req.cookies.get('NEXT_LOCALE')?.value || defaultLocale;
        return NextResponse.redirect(new URL(`/${locale}${ROUTES.AUTH}`, req.url));
    }

    // CAS C : Connecté tente d'aller sur Login/Register (sauf la home '/')
    if (valid && isPublic && pathWithoutLocale !== '/') {
        const locale = req.cookies.get('NEXT_LOCALE')?.value || defaultLocale;
        return NextResponse.redirect(new URL(`/${locale}${ROUTES.DASHBOARD}`, req.url));
    }

    // 6. Si tout est bon, on laisse next-intl faire son travail
    return intlMiddleware(req);
}

export const config = {
    matcher: [
        /*
         * Match toutes les routes sauf :
         * 1. api (requêtes backend)
         * 2. _next (fichiers internes Next.js)
         * 3. Tous les fichiers avec une extension (images, favicons, svg, etc.) 
         * grâce à (?!.*\\..*)
         */
        '/((?!api|_next|.*\\..*).*)',
    ],
};