import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function abzarrezaProxyPlugin(): Plugin {
  return {
    name: 'abzarreza-proxy',
    configureServer(server) {
      server.middlewares.use('/api/abzarreza/search', async (req, res) => {
        try {
          const urlObj = new URL(req.url || '', 'http://localhost:3000');
          const q = urlObj.searchParams.get('q');
          const customUrl = urlObj.searchParams.get('url');

          if (!q && !customUrl) {
            res.statusCode = 400;
            res.end('Missing query or url parameter');
            return;
          }

          const targetUrl = customUrl
            ? customUrl
            : `https://abzarreza.com/?s=${encodeURIComponent(q!)}&post_type=product`;

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 6000);
          try {
            const fetchRes = await fetch(targetUrl, {
              signal: controller.signal,
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'fa,en;q=0.9',
                'Referer': 'https://abzarreza.com/',
              },
            });
            const html = await fetchRes.text();
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('X-Abzarreza-Target', targetUrl);
            res.setHeader('X-Abzarreza-Status', String(fetchRes.status));
            res.end(html);
          } finally {
            clearTimeout(timeout);
          }
        } catch (err: any) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: err?.message || 'Proxy Error' }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    // مسیر نسبی: برای اجرا زیر /نام-ریپو/ در GitHub Pages
    base: './',
    plugins: [react(), tailwindcss(), abzarrezaProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
