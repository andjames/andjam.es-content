import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://andjam.es',
  output: 'static',
  trailingSlash: 'always',
  integrations: [mdx(), react(), sitemap()],
});
