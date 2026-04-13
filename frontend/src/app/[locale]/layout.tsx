// ajout de i18n avec NextIntlClientProvider pour fournir les messages traduits à toute l'application 
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { AuthProvider } from "@/providers/AuthProvider";
import { notFound } from 'next/navigation';
import { locales } from "@/config/i18n";
import DebugPanel from "@/components/debug/DebugPanel";


// dit à Next quelles locales existent pour le build statique
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as any)) {
    notFound();
  }
  setRequestLocale(locale);
  // charge les messages pour les composants clients
  const messages = (await import(`../../lang/${locale}.json`)).default;
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthProvider>
        <DebugPanel />
        {children}
      </AuthProvider>
    </NextIntlClientProvider>
  );
}