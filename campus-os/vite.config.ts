import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';

function localApi(): Plugin {
  return {
    name: 'campus-local-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      for (const key of ['GEMINI_API_KEY', 'GEMINI_MODEL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SCHOOL_DATA_SOURCE', 'CAMPUS_AI_DEMO_CODE']) {
        if (env[key]) process.env[key] = env[key];
      }
      server.middlewares.use('/api/ai', async (req: IncomingMessage, res: ServerResponse) => {
        try {
          const chunks: Buffer[] = []; let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 2097152) { res.writeHead(413, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: { code: 'request_too_large' } })); return; }
            chunks.push(chunk);
          }
          const request = new Request('http://localhost/api/ai', {
            method: req.method,
            headers: Object.entries(req.headers).filter(([,v]) => typeof v === 'string') as [string,string][],
            body: ['GET','HEAD'].includes(req.method || 'GET') ? undefined : Buffer.concat(chunks).toString(),
          });
          const mod = await server.ssrLoadModule('/api/ai.ts');
          const response: Response = await mod.handleCampusAI(request);
          res.writeHead(response.status, Object.fromEntries(response.headers));
          res.end(await response.text());
        } catch {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { code: 'server_error' } }));
        }
      });
    },
  };
}
export default defineConfig({
  plugins: [react(), localApi()],
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true },
  preview: { host: '0.0.0.0', allowedHosts: true },
  build: { sourcemap: false, chunkSizeWarningLimit: 1100 },
});
