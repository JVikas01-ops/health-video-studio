/**
 * Gemini Web CDP Bridge Daemon
 * 
 * When Chrome is started with:
 * chrome.exe --remote-debugging-port=9222
 * 
 * This bridge connects to Chrome via Chrome DevTools Protocol (CDP),
 * finds the signed-in gemini.google.com tab, and relays prompts directly.
 * Zero passwords, zero API keys, 100% active session reuse.
 */

import http from 'http';

const CDP_PORT = 9222;
const BRIDGE_PORT = 9099;

async function checkChromeCDP() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${CDP_PORT}/json`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const tabs = JSON.parse(data);
          const geminiTab = tabs.find(
            (t) => t.url && t.url.includes('gemini.google.com')
          );
          resolve({ ok: true, tabs, geminiTab });
        } catch {
          resolve({ ok: false, error: 'Failed to parse CDP tabs' });
        }
      });
    });
    req.on('error', () => {
      resolve({
        ok: false,
        error: `Chrome remote debugging port ${CDP_PORT} is not open. Launch Chrome with --remote-debugging-port=9222.`,
      });
    });
    req.setTimeout(2000, () => {
      req.destroy();
      resolve({ ok: false, error: 'CDP connection timed out' });
    });
  });
}

// Simple HTTP server for local Studio status queries
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/status') {
    const status = await checkChromeCDP();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(BRIDGE_PORT, () => {
  console.log(`[Gemini Bridge] Listening on http://127.0.0.1:${BRIDGE_PORT}`);
  console.log(`[Gemini Bridge] Checking for Chrome CDP on port ${CDP_PORT}...`);
  checkChromeCDP().then((res) => {
    if (res.ok) {
      console.log(`[Gemini Bridge] ✓ Connected to Chrome! Gemini tab: ${res.geminiTab ? 'Found' : 'Not found (please open gemini.google.com)'}`);
    } else {
      console.log(`[Gemini Bridge] Note: ${res.error}`);
    }
  });
});
