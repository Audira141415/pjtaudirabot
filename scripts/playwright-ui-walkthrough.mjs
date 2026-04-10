import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const DASHBOARD_CANDIDATES = [
  'http://localhost:3004',
  'http://localhost:3003',
  'http://localhost:3002',
  'http://localhost:3001',
];

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ACTION_MODE = process.env.UI_ACTION_MODE === 'destructive-on' ? 'destructive-on' : 'destructive-off';
const MAX_ACTIONS_PER_ROUTE = Number(process.env.UI_MAX_ACTIONS_PER_ROUTE || 4);

const BUTTON_DENY_PATTERN = /(delete|hapus|remove|restore|reset\b|create|buat|simpan|save|submit|logout|keluar|upload|mark completed|resolve|close ticket|cancel|revoke|restart|backup|bulk|add\b|tambah|new\b)/i;
const BUTTON_ALLOW_PATTERN = /(refresh|filter|search|cari|next|prev|lihat|view|detail|kelola|hanya aktif|\+nonaktif|today|week|month)/i;

const ROUTE_ACTION_WHITELIST = {
  '/': {
    safe: ['button:has-text("Refresh")'],
    destructive: [],
  },
  '/alerts': {
    safe: ['button:has-text("ACTIVE")', 'button:has-text("HISTORY")'],
    destructive: ['button[title="Resolve"]'],
  },
  '/checklist': {
    safe: ['button:has-text("Templates")', 'button:has-text("Active Items")'],
    destructive: ['button:has-text("Create Template")'],
  },
  '/maintenance': {
    safe: ['button:has-text("Filter")', 'button:has-text("Refresh")', 'button:has-text("+Nonaktif")', 'button:has-text("Today")'],
    destructive: ['button:has-text("Save")'],
  },
  '/backups': {
    safe: ['button:has-text("Refresh")'],
    destructive: ['button:has-text("Create Backup")', 'button[title="Restore"]'],
  },
  '/incidents': {
    safe: ['button:has-text("OPEN")', 'button:has-text("INVESTIGATING")'],
    destructive: ['button:has-text("Investigate")', 'button:has-text("Resolve")'],
  },
  '/campaigns': {
    safe: ['button:has-text("DRAFT")', 'button:has-text("SCHEDULED")', 'button:has-text("RUNNING")', 'button:has-text("COMPLETED")'],
    destructive: ['button:has-text("Schedule")', 'button:has-text("Jalankan")'],
  },
  '/faq': {
    safe: ['button:has-text("Batal")'],
    destructive: ['button:has-text("Tambah FAQ")', 'button:has-text("Simpan")'],
  },
  '/audit': {
    safe: ['button:has(svg.lucide-chevron-left)', 'button:has(svg.lucide-chevron-right)'],
    destructive: [],
  },
  '/auto-moderation': {
    safe: ['button:has-text("Edit")', 'button:has-text("Batal")'],
    destructive: ['button:has-text("Simpan")'],
  },
  '/api-keys': {
    safe: ['button:has-text("Tutup")'],
    destructive: ['button:has-text("Generate Key")', 'button:has-text("Generate")'],
  },
  '/exports': {
    safe: ['button:has-text("Refresh")'],
    destructive: ['button:has-text("Export Baru")', 'button:has-text("Mulai Export")'],
  },
  '/chatbot': {
    safe: ['button:has-text("Edit")', 'button:has-text("On")', 'button:has-text("Off")'],
    destructive: ['button:has-text("Flow Baru")', 'button:has-text("Simpan")'],
  },
  '/canned-responses': {
    safe: ['button:has-text("Edit")'],
    destructive: ['button:has-text("Response Baru")', 'button:has-text("Simpan")'],
  },
  '/crm': {
    safe: ['button:has-text("Batal")'],
    destructive: ['button:has-text("Tambah")', 'button:has-text("Simpan")'],
  },
  '/pipeline': {
    safe: [],
    destructive: ['button:has-text("Deal Baru")', 'button:has-text("Simpan")'],
  },
  '/groups': {
    safe: ['button:has-text("Filter")', 'button:has-text("Refresh")'],
    destructive: [],
  },
  '/tags': {
    safe: ['button:has-text("Filter")', 'button:has-text("Refresh")'],
    destructive: ['button:has-text("Tambah")'],
  },
  '/templates': {
    safe: ['button:has-text("Filter")', 'button:has-text("Refresh")'],
    destructive: ['button:has-text("Tambah")'],
  },
  '/webhooks': {
    safe: ['button:has-text("Refresh")'],
    destructive: ['button:has-text("Create")'],
  },
  '/webhook-logs': {
    safe: ['button:has-text("Refresh")'],
    destructive: [],
  },
  '/broadcast': {
    safe: ['button:has-text("Filter")'],
    destructive: ['button:has-text("Kirim")'],
  },
};

function sanitizeLabel(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function detectDashboardBaseUrl() {
  for (const url of DASHBOARD_CANDIDATES) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) {
        return url;
      }
    } catch {
      // Try next candidate.
    }
  }

  throw new Error(`Dashboard is not reachable on ${DASHBOARD_CANDIDATES.join(', ')}`);
}

async function login(page, baseUrl) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });

  await page.locator('input[type="text"]').first().fill(ADMIN_USERNAME);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 20000 });
}

async function getSidebarRoutes(page) {
  const linkLoc = page.locator('aside a[href^="/"], nav a[href^="/"]');
  const count = await linkLoc.count();
  const routes = [];
  const seen = new Set();

  for (let i = 0; i < count; i += 1) {
    const el = linkLoc.nth(i);
    const href = await el.getAttribute('href');
    if (!href || href === '/login') {
      continue;
    }

    if (seen.has(href)) {
      continue;
    }

    const label = sanitizeLabel(await el.innerText());
    seen.add(href);
    routes.push({ href, label: label || href });
  }

  return routes;
}

async function clickRoute(page, route) {
  const sidebarLink = page.locator(`aside a[href="${route.href}"], nav a[href="${route.href}"]`).first();
  if (await sidebarLink.count()) {
    await sidebarLink.click({ timeout: 10000 });
  } else {
    await page.goto(new URL(route.href, page.url()).toString(), { waitUntil: 'domcontentloaded' });
  }

  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

function getRouteSelectors(routeHref) {
  const routeConfig = ROUTE_ACTION_WHITELIST[routeHref] || { safe: [], destructive: [] };
  const modeSelectors = ACTION_MODE === 'destructive-on' ? routeConfig.safe.concat(routeConfig.destructive) : routeConfig.safe;
  return modeSelectors;
}

async function clickWhitelistedButtons(page, routeHref, networkFailures, consoleErrors) {
  const result = [];
  const selectors = getRouteSelectors(routeHref);
  const usedLabels = new Set();

  for (const selector of selectors) {
    if (result.length >= MAX_ACTIONS_PER_ROUTE) {
      break;
    }

    const button = page.locator(selector).first();
    if (!(await button.count())) {
      continue;
    }

    const isVisible = await button.isVisible().catch(() => false);
    if (!isVisible) {
      continue;
    }

    const label = sanitizeLabel(await button.innerText());
    const buttonLabel = label || selector;

    if (usedLabels.has(buttonLabel)) {
      continue;
    }
    usedLabels.add(buttonLabel);

    if (ACTION_MODE === 'destructive-off' && BUTTON_DENY_PATTERN.test(buttonLabel)) {
      continue;
    }

    try {
      const beforeFailures = networkFailures.length;
      const beforeConsoleErrors = consoleErrors.length;

      await button.click({ timeout: 7000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

      const newFailures = networkFailures.slice(beforeFailures);
      const newConsoleErrors = consoleErrors.slice(beforeConsoleErrors);

      if (newFailures.length > 0 || newConsoleErrors.length > 0) {
        result.push({
          label: buttonLabel,
          status: 'failed',
          apiErrors: newFailures,
          consoleErrors: newConsoleErrors,
          error: 'Action triggered API/console errors',
        });
      } else {
        result.push({ label: buttonLabel, status: 'passed' });
      }
    } catch (error) {
      result.push({ label: buttonLabel, status: 'failed', error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (result.length === 0) {
    result.push({ label: `(no whitelisted action in ${ACTION_MODE})`, status: 'skipped' });
  }

  return { routeHref, mode: ACTION_MODE, buttons: result };
}

async function run() {
  const startedAt = new Date().toISOString();
  const reportDir = path.resolve('test-results/ui-walkthrough');
  await ensureDir(reportDir);

  const baseUrl = await detectDashboardBaseUrl();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const networkFailures = [];
  const consoleErrors = [];

  page.on('response', (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && url.includes('/api/admin')) {
      networkFailures.push({ url, status });
    }
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text() });
    }
  });

  try {
    await login(page, baseUrl);
    const routes = await getSidebarRoutes(page);

    const pageResults = [];
    const buttonResults = [];

    for (const route of routes) {
      const beforeFailures = networkFailures.length;
      const beforeConsole = consoleErrors.length;

      try {
        await clickRoute(page, route);
        const title = sanitizeLabel(await page.title());
        const btnRes = await clickWhitelistedButtons(page, route.href, networkFailures, consoleErrors);
        const failures = networkFailures.slice(beforeFailures);
        const errors = consoleErrors.slice(beforeConsole);

        pageResults.push({
          route: route.href,
          label: route.label,
          status: failures.length === 0 && errors.length === 0 ? 'passed' : 'failed',
          title,
          apiErrors: failures,
          consoleErrors: errors,
        });
        buttonResults.push({ route: route.href, label: route.label, ...btnRes });
      } catch (error) {
        pageResults.push({
          route: route.href,
          label: route.label,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          apiErrors: networkFailures.slice(beforeFailures),
          consoleErrors: consoleErrors.slice(beforeConsole),
        });
        buttonResults.push({
          route: route.href,
          label: route.label,
          routeHref: route.href,
          buttons: [{ label: '(page load failed)', status: 'failed', error: error instanceof Error ? error.message : String(error) }],
        });
      }
    }

    const pagePassed = pageResults.filter((p) => p.status === 'passed').length;
    const pageFailed = pageResults.length - pagePassed;

    const flattenedButtons = buttonResults.flatMap((route) => route.buttons.map((btn) => ({ route: route.route, pageLabel: route.label, ...btn })));
    const buttonPassed = flattenedButtons.filter((b) => b.status === 'passed').length;
    const buttonFailed = flattenedButtons.filter((b) => b.status === 'failed').length;
    const buttonSkipped = flattenedButtons.filter((b) => b.status === 'skipped').length;

    const report = {
      startedAt,
      finishedAt: new Date().toISOString(),
      baseUrl,
      credentials: { username: ADMIN_USERNAME },
      summary: {
        actionMode: ACTION_MODE,
        pagesTested: pageResults.length,
        pagesPassed: pagePassed,
        pagesFailed: pageFailed,
        buttonsTested: buttonPassed + buttonFailed,
        buttonsPassed: buttonPassed,
        buttonsFailed: buttonFailed,
        buttonsSkipped: buttonSkipped,
      },
      pageResults,
      buttonResults: flattenedButtons,
      rawNetworkFailures: networkFailures,
      rawConsoleErrors: consoleErrors,
    };

    const jsonPath = path.join(reportDir, `report-${ACTION_MODE}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf8');

    const pageRows = pageResults
      .map((p) => `- ${p.status === 'passed' ? 'PASS' : 'FAIL'} ${p.label} (${p.route})${p.error ? ` -> ${p.error}` : ''}${p.apiErrors?.length ? ` | apiErrors=${p.apiErrors.length}` : ''}`)
      .join('\n');

    const buttonRows = flattenedButtons
      .map((b) => `- ${b.status.toUpperCase()} ${b.pageLabel} | ${b.label}`)
      .join('\n');

    const md = [
      '# UI Click Walkthrough Report',
      '',
      `- Base URL: ${baseUrl}`,
      `- Pages Tested: ${report.summary.pagesTested}`,
      `- Action Mode: ${ACTION_MODE}`,
      `- Pages Passed: ${report.summary.pagesPassed}`,
      `- Pages Failed: ${report.summary.pagesFailed}`,
      `- Buttons Passed: ${report.summary.buttonsPassed}`,
      `- Buttons Failed: ${report.summary.buttonsFailed}`,
      `- Buttons Skipped: ${report.summary.buttonsSkipped}`,
      '',
      '## Page Results',
      pageRows || '- (none)',
      '',
      '## Button Results',
      buttonRows || '- (none)',
      '',
      '## Notes',
      '- Actions are selected from per-route whitelist selectors.',
      '- Use UI_ACTION_MODE=destructive-off (default) for low-risk checks, or destructive-on for broader action coverage.',
      '- API errors are captured from browser network responses (status >= 400).',
    ].join('\n');

    const mdPath = path.join(reportDir, `report-${ACTION_MODE}.md`);
    await fs.writeFile(mdPath, md, 'utf8');

    console.log(`REPORT_JSON=${jsonPath}`);
    console.log(`REPORT_MD=${mdPath}`);
    console.log(`SUMMARY pages: ${pagePassed}/${pageResults.length} pass, buttons: ${buttonPassed} pass, ${buttonFailed} fail, ${buttonSkipped} skipped`);
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
