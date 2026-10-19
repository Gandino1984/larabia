import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Get API URL from environment variable, falling back to local backend.
  // In production this is supplied at build time via VITE_API_URL.
  const apiUrl = env.VITE_API_URL || 'http://localhost:3000';

  console.log('larabia-magazine vite config — API URL:', apiUrl, '· mode:', mode);

  // Dev proxy: any path the back-end serves needs an entry here so the
  // browser doesn't need CORS to reach the back-end during `vite dev`.
  const proxyPaths = [
    '/magazine-article',
    '/magazine-project',
    '/magazine-workshop',
    '/magazine-metadata',
    '/magazine-nav',
    '/magazine-theme',
    '/article-blocks',
    '/author-profile',
    '/engagement',
    '/subscription',
    '/user',
    '/contact',
    '/assets',
    '/uploads',
    '/paisaje',
    '/paisaje-files',
    '/open-space',
    '/health'
  ];
  const proxy = Object.fromEntries(
    proxyPaths.map((p) => [p, { target: apiUrl, changeOrigin: true, secure: false }])
  );

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5174,
      proxy
    },
    // Unit tests (vitest): the paisaje-sonoro engine brings its own suite
    // (src/paisaje — see its README). Pure logic runs in node; the player
    // test opts into jsdom per file.
    test: {
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx,js,jsx}']
    }
  };
});
