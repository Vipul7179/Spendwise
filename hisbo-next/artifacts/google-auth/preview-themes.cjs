// Read-only local preview: inject a theme attribute without changing app/user settings.
const http = require('node:http');
for (const [port, theme] of [[3191, 'light'], [3192, 'dark']]) {
  http.createServer(async (req, res) => {
    try {
      const upstream = await fetch('http://127.0.0.1:3188' + req.url, { redirect: 'manual' });
      let body = Buffer.from(await upstream.arrayBuffer());
      if ((upstream.headers.get('content-type') || '').includes('text/html')) {
        body = Buffer.from(body.toString().replace('<html ', `<html data-theme="${theme}" `));
      }
      for (const [name, value] of upstream.headers) {
        if (!['content-length', 'content-encoding', 'transfer-encoding', 'set-cookie'].includes(name)) res.setHeader(name, value);
      }
      res.writeHead(upstream.status);
      res.end(body);
    } catch { res.writeHead(502); res.end('Preview unavailable'); }
  }).listen(port, '127.0.0.1', () => console.log(`${theme} preview on ${port}`));
}
