// Reverse proxy: localhost:3000 → cinepurr.me
// Used for TestSprite testing against the production deployment
const http = require('http');
const https = require('https');

const TARGET = 'cinepurr.me';
const PORT = 3000;

const server = http.createServer((req, res) => {
  const reqHeaders = { ...req.headers, host: TARGET };
  
  if (reqHeaders.origin) {
    reqHeaders.origin = reqHeaders.origin.replace(`http://localhost:${PORT}`, `https://${TARGET}`);
  }
  if (reqHeaders.referer) {
    reqHeaders.referer = reqHeaders.referer.replace(`http://localhost:${PORT}`, `https://${TARGET}`);
  }

  const options = {
    hostname: TARGET,
    port: 443,
    path: req.url,
    method: req.method,
    headers: reqHeaders,
  };

  delete options.headers['connection'];
  delete options.headers['accept-encoding']; // Prevent gzip to easily rewrite contents if needed, though we only rewrite headers

  const proxy = https.request(options, (proxyRes) => {
    const headers = { ...proxyRes.headers };
    
    // Rewrite redirects back to localhost
    if (headers.location && headers.location.includes(TARGET)) {
      headers.location = headers.location.replace(`https://${TARGET}`, `http://localhost:${PORT}`);
    }
    
    // Fix cookies for localhost (remove Domain and Secure)
    if (headers['set-cookie']) {
      const cookies = Array.isArray(headers['set-cookie']) ? headers['set-cookie'] : [headers['set-cookie']];
      headers['set-cookie'] = cookies.map(cookie => {
        return cookie
          .replace(/Domain=[^;]+;?/i, '')
          .replace(/Secure;?/i, '')
          .replace(/SameSite=Lax/i, 'SameSite=Lax')
          .replace(/SameSite=Strict/i, 'SameSite=Lax'); // relax for proxy
      });
    }

    delete headers['strict-transport-security'];

    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res, { end: true });
  });

  proxy.on('error', (err) => {
    console.error(`Proxy error: ${err.message}`);
    res.writeHead(502);
    res.end('Bad Gateway');
  });

  req.pipe(proxy, { end: true });
});

server.listen(PORT, () => {
  console.log(`✅ Reverse proxy running: http://localhost:${PORT} → https://${TARGET}`);
  console.log(`   TestSprite will test against cinepurr.me through this proxy`);
});
