import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from 'next/navigation';
import { AuthProvider } from "@/providers/AuthProvider";
import { LOCALES } from "@ftt/shared/i18n";
import DebugPanel from "@/components/debug/DebugPanel";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
	title: "MovieStarPlanet 42",
	description: "MovieStarPlanet 42"
};

export function generateStaticParams() {
	return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	if (!(LOCALES as readonly string[]).includes(locale)) notFound();
	setRequestLocale(locale);
	const messages = (await import(`@ftt/shared/i18n/locales/${locale}.json`)).default;

	return (
		<html
			lang={locale}
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
