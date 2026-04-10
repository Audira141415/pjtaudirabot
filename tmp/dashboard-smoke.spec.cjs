const { test } = require('@playwright/test');
const fs = require('fs');

const routes = [
  { path: '/', name: 'Dashboard' },
  { path: '/users', name: 'Users' },
  { path: '/tickets', name: 'Tickets' },
  { path: '/sla', name: 'SLA Monitor' },
  { path: '/alerts', name: 'Alerts' },
  { path: '/tasks', name: 'Tasks' },
  { path: '/shift', name: 'Shift Handover' },
  { path: '/checklist', name: 'Checklists' },
  { path: '/reminders', name: 'Reminders' },
  { path: '/maintenance', name: 'Maintenance' },
  { path: '/uptime', name: 'Uptime Monitor' },
  { path: '/network', name: 'Network Health' },
  { path: '/server', name: 'Server Status' },
  { path: '/backups', name: 'Backups' },
  { path: '/incidents', name: 'AI Insights' },
  { path: '/sentiment', name: 'Sentiment Analysis' },
  { path: '/analytics', name: 'Analytics' },
  { path: '/csat', name: 'CSAT Survey' },
  { path: '/knowledge', name: 'Knowledge Base' },
  { path: '/memory', name: 'Memory Browser' },
  { path: '/reports', name: 'Reports' },
  { path: '/broadcast', name: 'Broadcast' },
  { path: '/campaigns', name: 'Campaigns' },
  { path: '/scheduled-messages', name: 'Scheduled Messages' },
  { path: '/inbox', name: 'Unified Inbox' },
  { path: '/templates', name: 'Templates' },
  { path: '/canned-responses', name: 'Canned Responses' },
  { path: '/chatbot', name: 'Chatbot Builder' },
  { path: '/moderation', name: 'Moderation' },
  { path: '/groups', name: 'Groups' },
  { path: '/faq', name: 'FAQ Manager' },
  { path: '/crm', name: 'CRM Contacts' },
  { path: '/pipeline', name: 'CRM Pipeline' },
  { path: '/payments', name: 'Payments' },
  { path: '/tags', name: 'Tags & Labels' },
  { path: '/agents', name: 'Agents' },
  { path: '/flows', name: 'Flows' },
  { path: '/webhooks', name: 'Webhooks' },
  { path: '/webhook-logs', name: 'Webhook Logs' },
  { path: '/audit', name: 'Audit Logs' },
  { path: '/auto-moderation', name: 'Auto-Moderation' },
  { path: '/notification-rules', name: 'Notification Rules' },
  { path: '/api-keys', name: 'API Keys' },
  { path: '/files', name: 'File Manager' },
  { path: '/exports', name: 'Export Center' },
  { path: '/bulk', name: 'Bulk Operations' },
  { path: '/language', name: 'Language' },
  { path: '/settings', name: 'Settings' }
];

const dangerPattern = /(delete|remove|destroy|drop|truncate|logout|reset\b|purge|wipe|broadcast\b|send\b|pay\b|charge\b|restore\b|shutdown|terminate|clear\s+all|acknowledge|resolve|disable|revoke)/i;
const safePattern = /(refresh|reload|search|filter|view|open|preview|test|check|sync|scan|analy|export|download|next|previous|details|history|logs|generate|run|verify|retry)/i;

function probableCauseFromErrors(errors) {
  const text = errors.join(' | ').toLowerCase();
  if (/401|unauthorized|expired token|invalid token/.test(text)) return 'Authentication/token issue';
  if (/403|forbidden|permission|not allowed/.test(text)) return 'Permission or role restriction';
  if (/429|rate limit|quota/.test(text)) return 'Quota or rate-limit dependency';
  if (/404|not found|cannot\s+get/.test(text)) return 'Missing route/handler or unimplemented API';
  if (/5\d\d|internal server error|exception/.test(text)) return 'Backend/server error or data dependency';
  if (/enotfound|econnrefused|failed to fetch|networkerror|cors/.test(text)) return 'External dependency/network failure';
  return 'Likely data/state dependency or frontend handler issue';
}

async function clickSafeButton(page) {
  const candidates = page.locator('main button:visible, main [role="button"]:visible, main a[role="button"]:visible');
  const count = await candidates.count();
  let fallback = null;

  for (let i = 0; i < Math.min(count, 30); i++) {
    const el = candidates.nth(i);
    const text = ((await el.innerText().catch(() => '')) || '').trim();
    const aria = (await el.getAttribute('aria-label').catch(() => '')) || '';
    const title = (await el.getAttribute('title').catch(() => '')) || '';
    const id = (await el.getAttribute('id').catch(() => '')) || '';
    const merged = `${text} ${aria} ${title} ${id}`.trim();
    if (!merged) continue;
    if (dangerPattern.test(merged)) continue;
    if (!fallback) fallback = { el, label: merged };
    if (safePattern.test(merged)) {
      await el.click({ timeout: 5000 });
      return { clicked: true, label: merged, safety: 'safe-pattern' };
    }
  }

  if (fallback) {
    await fallback.el.click({ timeout: 5000 });
    return { clicked: true, label: fallback.label, safety: 'fallback-non-danger' };
  }

  return { clicked: false, label: 'No button found in main content', safety: 'none' };
}

test('dashboard smoke traversal', async ({ page }) => {
  const base = 'http://localhost:3002';
  const results = [];
  const routeErrors = {};
  let activeRoute = 'GLOBAL';

  const pushErr = (msg) => {
    if (!routeErrors[activeRoute]) routeErrors[activeRoute] = [];
    if (routeErrors[activeRoute].length < 10) routeErrors[activeRoute].push(msg);
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') pushErr(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => pushErr(`pageerror: ${err.message}`));
  page.on('response', (resp) => {
    const u = resp.url();
    if (u.includes('/api/') && resp.status() >= 400) {
      pushErr(`http ${resp.status()} ${u}`);
    }
  });

  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForLoadState('networkidle').catch(() => {});

  for (const route of routes) {
    activeRoute = route.path;
    routeErrors[activeRoute] = [];
    const item = { ...route, status: 'PASS', interaction: '', errors: [], probableCause: '' };

    try {
      await page.goto(`${base}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(400);
      if (page.url().includes('/login')) {
        item.status = 'FAIL';
        item.errors.push('Redirected to login (session/auth issue)');
      } else {
        const interaction = await clickSafeButton(page);
        item.interaction = interaction.label;
        if (!interaction.clicked) {
          item.status = 'FAIL';
          item.errors.push('No safe clickable primary interaction found on page');
        }
      }
    } catch (e) {
      item.status = 'FAIL';
      item.errors.push(`Navigation/interaction error: ${e.message}`);
    }

    const errs = routeErrors[activeRoute] || [];
    if (errs.length) {
      item.errors.push(...errs);
      if (item.status !== 'FAIL') item.status = 'FAIL';
    }

    if (item.status === 'FAIL') {
      item.probableCause = probableCauseFromErrors(item.errors);
    }

    results.push(item);
  }

  const passed = results.filter((r) => r.status === 'PASS');
  const failed = results.filter((r) => r.status === 'FAIL');
  const summary = {
    total: results.length,
    passed: passed.length,
    failed: failed.length,
    testedAt: new Date().toISOString(),
    results,
  };

  fs.writeFileSync('f:/PJTAUDIRABOT/tmp/dashboard-smoke-results.json', JSON.stringify(summary, null, 2));
  console.log(`SMOKE_TOTAL=${summary.total}`);
  console.log(`SMOKE_PASSED=${summary.passed}`);
  console.log(`SMOKE_FAILED=${summary.failed}`);
});
