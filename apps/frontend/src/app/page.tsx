import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { resolveLocale } from '@ftt/shared/i18n';
import { env } from '@/lib/env';

export default async function RootPage() {
    const cookieStore = await cookies();
    // Cookie utilisateur en priorite, puis env, puis fallback shared.
    const locale = resolveLocale(
        cookieStore.get('NEXT_LOCALE')?.value ?? env.NEXT_PUBLIC_DEFAULT_LOCALE,
    );
    redirect(`/${locale}`);
}