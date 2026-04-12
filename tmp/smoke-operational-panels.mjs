const loginRes = await fetch('http://localhost:4000/api/admin/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'w5MIa6ZfwQNO5PiOKl0Xaqan0et97jLH' }),
});
const loginJson = await loginRes.json();
const token = loginJson.token;
const auth = { Authorization: `Bearer ${token}` };

const alertsUrl = new URL('http://localhost:4000/api/admin/alerts');
alertsUrl.searchParams.set('status', 'ACTIVE');
alertsUrl.searchParams.set('page', '1');

const incidentsUrl = new URL('http://localhost:4000/api/admin/incidents');
incidentsUrl.searchParams.set('status', 'OPEN');
incidentsUrl.searchParams.set('page', '1');

const responses = await Promise.all([
  fetch('http://localhost:4000/health'),
  fetch('http://localhost:4000/api/admin/sla/dashboard', { headers: auth }),
  fetch(alertsUrl, { headers: auth }),
  fetch(incidentsUrl, { headers: auth }),
  fetch('http://localhost:4000/api/tickets/open/clusters', { headers: auth }),
]);

for (const response of responses) {
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
}

const [healthRes, slaRes, alertsRes, incidentsRes, clustersRes] = await Promise.all(
  responses.map((response) => response.json())
);

console.log(JSON.stringify({
  health: healthRes.status,
  sla: slaRes.data?.totalTracked ?? null,
  alerts: alertsRes.pagination?.total ?? null,
  incidents: incidentsRes.pagination?.total ?? null,
  clusters: clustersRes.totalClusters ?? null,
}, null, 2));
