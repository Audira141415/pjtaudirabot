const http = require('http');

async function request(path, opts = {}) {
  return new Promise((res, rej) => {
    const req = http.request({ hostname: 'localhost', port: 4000, path, ...opts }, (rsp) => {
      let body = '';
      rsp.on('data', d => body += d);
      rsp.on('end', () => res({ status: rsp.statusCode, body: body.slice(0, 300) }));
    });
    req.on('error', rej);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

(async () => {
  // Login
  const loginRes = await request('/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Audira@2026!' })
  });
  const { token } = JSON.parse(loginRes.body);
  console.log('Token:', token ? 'OK' : 'FAILED');

  const endpoints = [
    '/api/admin/sla/dashboard',
    '/api/admin/alerts',
    '/api/admin/escalations',
    '/api/admin/incidents',
    '/api/admin/tickets?page=1&limit=5',
    '/api/admin/server/status',
    '/api/admin/server/logs?page=1',
    '/api/admin/shift-handovers/current',
    '/api/admin/network/branches',
  ];

  for (const ep of endpoints) {
    const r = await request(ep, { headers: { Authorization: `Bearer ${token}` } });
    const ok = r.status === 200 ? '✅' : '❌';
    console.log(`${ok} [${r.status}] ${ep}: ${r.body.slice(0, 80)}`);
  }
})();
