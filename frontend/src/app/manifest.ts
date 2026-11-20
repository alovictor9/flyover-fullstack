import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Flyover — The Affiliate Growth Network',
    short_name: 'Flyover',
    description: 'Publish campaigns, share referral links and earn verified commissions.',
    start_url: '/login?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F5F8FA',
    theme_color: '#17324D',
    categories: ['business', 'finance', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Marketplace', url: '/marketplace' },
      { name: 'My wallet', url: '/affiliate/wallet' },
    ],
  };
}
