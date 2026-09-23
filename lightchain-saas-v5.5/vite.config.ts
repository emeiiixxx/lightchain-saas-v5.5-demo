import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const pagesBase = '/lightchain-saas-v5.5-demo/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? pagesBase : '/',
  plugins: [
    {
      name: 'pages-public-assets',
      enforce: 'pre',
      transform(code, id) {
        if (command !== 'build' || !/\/src\/.*\.[jt]sx?$/.test(id)) return;
        return code.replaceAll('/assets/', `${pagesBase}assets/`);
      },
    },
    react(),
    tailwindcss(),
  ],
}));
