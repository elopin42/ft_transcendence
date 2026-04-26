// src/app/not-found.tsx
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { defaultLocale } from '@/config/i18n';

export default async function RootNotFound() {
    const cookieStore = await cookies();
    const locale = cookieStore.get('NEXT_LOCALE')?.value || defaultLocale;
    redirect(`/${locale}/not-found`);
}