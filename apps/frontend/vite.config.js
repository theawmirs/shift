import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'favicon.png', 'logo.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'fonts/**/*'],
      manifest: {
        name: 'شیفت | مدیریت هوشمند کارکرد و مرخصی',
        short_name: 'Shift',
        description: 'سامانه مدیریت کارکرد، شیفت، مرخصی و تسک‌های روزانه مبتنی بر تقویم جلالی',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        dir: 'rtl',
        lang: 'fa',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'ثبت ورود / خروج',
            short_name: 'تردد',
            description: 'ورود به صفحه ثبت وضعیت روزانه',
            url: '/',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'تسک‌های امروز',
            short_name: 'تسک‌ها',
            description: 'مشاهده و مدیریت تسک‌ها',
            url: '/tasks',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'گزارش هفته',
            short_name: 'گزارش',
            description: 'خلاصه ساعات کارکرد هفته',
            url: '/week',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/telegram\.org\/js\/telegram-web-app\.js/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'telegram-cdn-cache',
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: { host: '0.0.0.0', port: 34471, allowedHosts: true, cors: true, proxy: { '/api': 'http://127.0.0.1:34472' } },
  preview: { host: '0.0.0.0', port: 34471, allowedHosts: true, cors: true }
})
