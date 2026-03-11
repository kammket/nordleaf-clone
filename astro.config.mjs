// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://grunapotheke.de',
  trailingSlash: 'never',
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/cart') &&
        !page.includes('/checkout') &&
        !page.includes('/404'),
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      serialize: (item) => {
        if (item.url === 'https://grunapotheke.de/') {
          item.priority = 1.0;
          item.changefreq = 'daily';
        } else if (item.url.includes('/products')) {
          item.priority = 0.9;
          item.changefreq = 'daily';
        } else if (item.url.includes('/kategorie/')) {
          item.priority = 0.8;
          item.changefreq = 'weekly';
        } else if (item.url.includes('/ratgeber/') || item.url.includes('/indikationen/') || item.url.includes('/cannabis-arzt/')) {
          item.priority = 0.7;
          item.changefreq = 'monthly';
        } else if (item.url.includes('/impressum') || item.url.includes('/datenschutz') || item.url.includes('/agb') || item.url.includes('/widerruf')) {
          item.priority = 0.1;
          item.changefreq = 'yearly';
        }
        return item;
      },
    }),
  ],
});
