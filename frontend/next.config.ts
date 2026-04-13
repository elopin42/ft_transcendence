import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin"; // ajout du plugin next-intl pour la gestion de l'internationalisation directement avec [locales] dans le dossier app

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig); // ajout de i18n par dessus de la config Next.js