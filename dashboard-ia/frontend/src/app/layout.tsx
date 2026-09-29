import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import MioRadialMenu from '@/components/MioRadialMenu';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MIO // Intelligent Data Operations & AutoML',
  description: 'Transformá planillas de datos en decisiones inteligentes con IA. Análisis automático, gráficos y predicciones en 60 segundos.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-mio-lime focus:text-gray-950 focus:font-black focus:border-2 focus:border-[#111] focus:shadow-[4px_4px_0px_#111] focus:outline-none"
        >
          Saltar al contenido principal
        </a>
        {children}
        <CookieConsentBanner />
        <MioRadialMenu />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1a1a2e',
              color: '#fff',
              borderRadius: '12px',
            },
          }}
        />
      </body>
    </html>
  );
}

