import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// On exporte les versions "intelligentes" des outils de navigation Next.js
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);