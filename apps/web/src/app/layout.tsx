import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { ThemeToggle } from '../components/theme-toggle';
import { DemoBanner } from '../components/demo-banner';
import { PwaRegister } from '../components/pwa-register';
import './styles.css';
import './platform.css';

export const metadata: Metadata = {
  title: 'LOOP AMBIENTAL | Marketplace B2B de resíduos industriais',
  description:
    'Transforme resíduos industriais e subprodutos em valor para a cadeia produtiva.',
  applicationName: 'LOOP AMBIENTAL',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'LOOP', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#102b2b',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const stored = localStorage.getItem('loop-theme');
                const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.dataset.theme = stored || (systemDark ? 'dark' : 'light');
              } catch {}
            })();`,
          }}
        />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <DemoBanner />
          {children}
          <ThemeToggle />
          <PwaRegister />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
