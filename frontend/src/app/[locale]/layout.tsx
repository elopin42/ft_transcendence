
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// ajout de i18n avec NextIntlClientProvider pour fournir les messages traduits à toute l'application 
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { AuthProvider } from "@/providers/AuthProvider";
import { notFound } from 'next/navigation';
import { locales } from "@/config/i18n";
import DebugPanel from "@/components/debug/DebugPanel";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MSP 42",
  description: "MovieStarPlanet 42",
  icons: { icon: '/favicon.ico' },
};

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
  if (!(locales as readonly string[]).includes(locale)) notFound();
  setRequestLocale(locale);
  const messages = (await import(`../../lang/${locale}.json`)).default;

  return (
    <html
      lang={locale} // dynamique ! 'fr' ou 'en' selon l'url
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <DebugPanel />
            {children}
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}