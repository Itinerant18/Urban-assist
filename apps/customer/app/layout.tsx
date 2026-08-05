import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Inter, JetBrains_Mono } from 'next/font/google';

// next/font self-hosts and preloads: no render-blocking request to fonts.googleapis.com,
// no layout shift from a late swap. The CSS variables feed the shared Tailwind preset.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-mono',
  display: 'swap',
});


export const metadata: Metadata = {
  title: 'Urban Assist — Home Services in the UK',
  description:
    'Book trusted home services across the UK — cleaning, repair, installation, and more. Verified professionals, transparent pricing.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Urban Assist',
  },
  applicationName: 'Urban Assist',
};

export const viewport: Viewport = {
  themeColor: '#F5F1EB',
  width: 'device-width',
  initialScale: 1,
  // Let fixed bottom bars extend under the iPhone home indicator (safe-area insets).
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
