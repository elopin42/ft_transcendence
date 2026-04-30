import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
	reactCompiler: { compilationMode: 'annotation' },
	transpilePackages: ['@ftt/shared'],
};

export default withNextIntl(nextConfig);
