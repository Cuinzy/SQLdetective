import type { Metadata, Viewport } from 'next';
// Fuentes incluidas en el proyecto (sin descargas de Google durante el build).
import '@fontsource/pixelify-sans/latin-400.css';
import '@fontsource/pixelify-sans/latin-600.css';
import '@fontsource/courier-prime/latin-400.css';
import '@fontsource/courier-prime/latin-700.css';
import '@fontsource/vt323/latin-400.css';
import '@fontsource/special-elite/latin-400.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'SQL Detective: Archivos del Crimen',
  description: 'Videojuego educativo de investigación criminal: resuelve 15 casos consultando bases de datos reales con SQL.',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = { themeColor: '#12161c', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
