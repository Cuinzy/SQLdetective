import type { Metadata, Viewport } from 'next';
import { Pixelify_Sans, Courier_Prime, VT323, Special_Elite } from 'next/font/google';
import './globals.css';

const pixel = Pixelify_Sans({ subsets: ['latin'], weight: ['400', '600'], variable: '--f-pixel', display: 'swap' });
const courier = Courier_Prime({ subsets: ['latin'], weight: ['400', '700'], variable: '--f-courier', display: 'swap' });
const vt = VT323({ subsets: ['latin'], weight: '400', variable: '--f-vt', display: 'swap' });
const elite = Special_Elite({ subsets: ['latin'], weight: '400', variable: '--f-elite', display: 'swap' });

export const metadata: Metadata = {
  title: 'SQL Detective: Archivos del Crimen',
  description: 'Videojuego educativo de investigación criminal: resuelve 15 casos consultando bases de datos reales con SQL.',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = { themeColor: '#12161c', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${pixel.variable} ${courier.variable} ${vt.variable} ${elite.variable}`}>
      <body>{children}</body>
    </html>
  );
}
