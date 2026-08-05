import type { Metadata } from 'next';
import { ThemeToggle } from '../components/theme-toggle';
import './styles.css';

export const metadata: Metadata = {
  title: 'LOOP AMBIENTAL | Marketplace B2B de resíduos industriais',
  description:
    'Transforme resíduos industriais e subprodutos em valor para a cadeia produtiva.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
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
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
