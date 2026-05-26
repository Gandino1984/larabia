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
    '/article-blocks',
    '/author-profile',
    '/user',
    '/contact',
    '/assets',
    '/uploads',
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
    }
  };
});
