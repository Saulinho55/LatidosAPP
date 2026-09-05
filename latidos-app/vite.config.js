import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      },
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Latidos',
        short_name: 'Latidos',
        description: 'App para cuidar el corazón y el comercio local',
        theme_color: '#FDFBF7',
        background_color: '#FDFBF7',
        display: 'standalone',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/833/833472.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://cdn-icons-png.flaticon.com/512/833/833472.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
