import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add robust streaming live proxy route to bypass HTTPS Mixed Content blocks
  app.get("/api/stream-proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      res.status(400).send("Missing target url parameter");
      return;
    }

    try {
      // Set a robust 5-second timeout for the stream fetch to fail fast on dead/unresponsive links
      const response = await fetch(targetUrl, {
        signal: AbortSignal.timeout(5000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': targetUrl,
        }
      });

      if (!response.ok) {
        res.status(response.status).send(`Failed to stream from remote host: ${response.statusText}`);
        return;
      }

      const finalUrl = response.url || targetUrl;
      const contentType = response.headers.get('content-type') || '';
      const isM3U8 = targetUrl.toLowerCase().includes('.m3u8') || 
                     finalUrl.toLowerCase().includes('.m3u8') || 
                     contentType.includes('mpegurl') || 
                     contentType.includes('mpegURL');

      const origin = req.headers.origin || '*';
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

      if (isM3U8) {
        const text = await response.text();
        // Resolve lines
        const lines = text.split(/\r?\n/);
        const rewrittenLines = lines.map(line => {
          const trimmed = line.trim();
          if (trimmed === '') return line;

          if (!trimmed.startsWith('#')) {
            try {
              const resolved = new URL(trimmed, finalUrl).toString();
              return `/api/stream-proxy?url=${encodeURIComponent(resolved)}`;
            } catch (err) {
              return line;
            }
          }

          // Handle #EXT-X-KEY and #EXT-X-MAP
          if (trimmed.startsWith('#EXT-X-KEY') || trimmed.startsWith('#EXT-X-MAP')) {
            return trimmed.replace(/URI="([^"]+)"/g, (_, p1) => {
              try {
                const resolved = new URL(p1, finalUrl).toString();
                return `URI="/api/stream-proxy?url=${encodeURIComponent(resolved)}"`;
              } catch (err) {
                return `URI="${p1}"`;
              }
            });
          }

          return line;
        });

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.send(rewrittenLines.join('\n'));
      } else {
        // Direct media pipeline (TS fragments, chunks, audio, subtitles keys, etc.)
        if (response.headers.get('content-type')) {
          res.setHeader('Content-Type', response.headers.get('content-type')!);
        }
        if (response.headers.get('content-length')) {
          res.setHeader('Content-Length', response.headers.get('content-length')!);
        }

        // Stream reader loop to pipe response chunks
        if (response.body) {
          const reader = (response.body as any).getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        } else {
          res.status(502).send("Active content stream empty");
        }
      }
    } catch (err: any) {
      const isTimeout = err.name === 'TimeoutError' || err.message?.includes('timeout') || err.message?.includes('Timeout');
      if (isTimeout) {
        console.warn(`⏳ [Proxy Timeout] Stream offline or connection timed out for: ${targetUrl}`);
        res.status(504).send(`Error: Stream connection timed out (Offline feed).`);
      } else {
        console.warn(`❌ [Proxy Fail] Stream connection refused or invalid stream for: ${targetUrl} - ${err.message}`);
        res.status(502).send(`Error: Failed to stream from host (${err.message}).`);
      }
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite development middleware vs Static Production server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting on port ${PORT}`);
  });
}

startServer();
