import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { ThemeToggle } from '../components/theme-toggle';
import { DemoBanner } from '../components/demo-banner';
import './styles.css';
import './platform.css';

export const metadata: Metadata = {
  title: 'LOOP AMBIENTAL | Marketplace B2B de resíduos industriais',
  description:
    'Transforme resíduos industriais e subprodutos em valor para a cadeia produtiva.',
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
