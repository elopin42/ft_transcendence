import { StrictMode } from 'react';

// root layout - requis par Next.js mais vide
// le vrai layout avec <html>/<body> est dans [locale]/layout.tsx
// car lui seul connait la locale courante
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <StrictMode>
      {children}
    </StrictMode>
  );
}