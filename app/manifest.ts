import type { MetadataRoute } from 'next';

// Web app manifest — makes Pitch Vault installable (Add to Home Screen).
// Colours match the dark palette in globals.css (hsl(224 71% 4%) ≈ #030711).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pitch Vault',
    short_name: 'Pitch Vault',
    description: 'Share secret pitches and presentations securely',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#030711',
    theme_color: '#030711',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
