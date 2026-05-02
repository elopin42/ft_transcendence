import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { defaultLocale } from '@/config/i18n';

export default async function RootPage() {
    const cookieStore = await cookies();
    // On regarde si l'utilisateur a déjà une langue enregistrée, sinon défaut
    const locale = cookieStore.get('NEXT_LOCALE')?.value || defaultLocale;
    
    redirect(`/${locale}`);
}