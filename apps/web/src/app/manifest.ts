import type { MetadataRoute } from 'next';

// Installable PWA: the "mobile app" of the platform without a separate
// native codebase (AGENTS.md defers native apps until there is demand).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LOOP AMBIENTAL — Marketplace de resíduos',
    short_name: 'LOOP',
    description:
      'Compra e venda B2B de resíduos, recicláveis e subprodutos industriais.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#eef2ed',
    theme_color: '#102b2b',
    lang: 'pt-BR',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Anúncios', url: '/anuncios' },
      { name: 'Mensagens', url: '/dashboard/mensagens' },
      { name: 'Negociações', url: '/dashboard/negociacoes' },
    ],
  };
}
