import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { resolveLocale } from '@ftt/shared/i18n';
import { env } from '@/lib/env';

export default async function RootNotFound() {
    const cookieStore = await cookies();
    const locale = resolveLocale(
        cookieStore.get('NEXT_LOCALE')?.value ?? env.NEXT_PUBLIC_DEFAULT_LOCALE,
    );
    redirect(`/${locale}/not-found`);
}