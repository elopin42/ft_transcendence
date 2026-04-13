import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose'; // compatible edge + node runtime
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/config/routing';
import { locales, defaultLocale } from '@/config/i18n';
import { ROUTES, ROUTES_PUBLIC } from '@/config/routes';

// next-intl gere la detection de langue et les redirections de locale
const intlMiddleware = createMiddleware(routing);

export async function proxy(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    const path = req.nextUrl.pathname;

    // On récupère la locale (via cookie ou défaut)
    const locale = req.cookies.get('NEXT_LOCALE')?.value || defaultLocale;

    // Vérification si le chemin commence par une locale valide
    // On ajoute le "/" pour être sûr de ne pas matcher "/france" si la locale est "fr"
    const hasLocale = locales.some(l => path.startsWith(`/${l}/`) || path === `/${l}`);

    //  CAS A : Redirection si locale manquante
    // Si l'utilisateur tape /dashboard, on le force vers /fr/dashboard
    if (!hasLocale && path !== '/') {
        return NextResponse.redirect(new URL(`/${locale}${path}`, req.url));
    }

    // Extraction du path "propre" (sans /fr ou /en)
    // On s'assure que /fr/auth devient /auth (avec le slash)
    const pathWithoutLocale = hasLocale
        ? path.replace(/^\/(fr|en)/, '') || '/'
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
            // on pourrait appeler le back pour en recuperer un nouveau ici
            valid = false;
        }
    }

    // --- LOGIQUE DE REDIRECTION ---

    // CAS B : Non connecté tente d'aller sur une route privée
    if (!valid && !isPublic) {
        return NextResponse.redirect(new URL(`/${locale}${ROUTES.AUTH}`, req.url));
    }

    // CAS C : Connecté tente d'aller sur Login/Register (sauf la home '/')
    if (valid && isPublic && pathWithoutLocale !== '/') {
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