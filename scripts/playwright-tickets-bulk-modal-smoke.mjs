import { chromium } from 'playwright';

const DASHBOARD_CANDIDATES = [
  'http://localhost:3004',
  'http://localhost:3003',
  'http://localhost:3002',
  'http://localhost:3001',
];

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ACTIVE_STATUS_CANDIDATES = ['OPEN', 'IN_PROGRESS', 'WAITING', 'ESCALATED'];

async function detectBaseUrl() {
  for (const url of DASHBOARD_CANDIDATES) {
    try {
      const res = await fetch(`${url}/login`, { method: 'GET' });
      if (!res.ok) continue;

      const html = await res.text();
      if (html.includes('AudiraBot Dashboard') || html.includes('Sign in to manage your bots')) {
        return url;
      }
    } catch {
      // Try next URL.
    }
  }

  throw new Error(`Dashboard login is not reachable on ${DASHBOARD_CANDIDATES.join(', ')}`);
}

async function login(page, baseUrl) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });

  await page.locator('input[type="text"]').first().fill(ADMIN_USERNAME);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 20000 });
}

async function pickResolvableStatus(page) {
  const statusSelect = page.locator('select').first();

  for (const status of ACTIVE_STATUS_CANDIDATES) {
    await statusSelect.selectOption(status);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const noTickets = await page.getByText('No tickets found').isVisible().catch(() => false);
    if (!noTickets) {
      return status;
    }
  }

  throw new Error('Tidak menemukan tiket aktif (OPEN/IN_PROGRESS/WAITING/ESCALATED) untuk smoke modal.');
}

async function run() {
  const baseUrl = await detectBaseUrl();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await login(page, baseUrl);

    await page.goto(`${baseUrl}/tickets`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    const selectedStatus = await pickResolvableStatus(page);

    const firstTicketCell = page.locator('tbody tr td').first();
    await firstTicketCell.waitFor({ state: 'visible', timeout: 10000 });
    const firstTicketNumber = (await firstTicketCell.textContent())?.trim() || '(unknown-ticket)';

    const resolveFilteredBtn = page.getByRole('button', { name: 'Resolve All Filtered Tickets' });
    await resolveFilteredBtn.waitFor({ state: 'visible', timeout: 10000 });

    if (await resolveFilteredBtn.isDisabled()) {
      const noTickets = await page.getByText('No tickets found').isVisible().catch(() => false);
      if (noTickets) {
        console.log(`SMOKE_SKIPPED baseUrl=${baseUrl} reason=no-eligible-tickets status=${selectedStatus}`);
        return;
      }
      throw new Error('Resolve All Filtered Tickets button is disabled unexpectedly.');
    }

    await resolveFilteredBtn.click();

    await page.getByRole('heading', { name: 'Resolve All Filtered Tickets' }).waitFor({ timeout: 10000 });
    await page.getByText('Step 1 of 2').waitFor({ timeout: 10000 });

    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByText('Step 2 of 2').waitFor({ timeout: 10000 });
    const executeButton = page.getByRole('button', { name: 'Execute Bulk Resolve' });
    const isDisabledBefore = await executeButton.isDisabled();
    if (!isDisabledBefore) {
      throw new Error('Execute button seharusnya disabled sebelum input RESOLVE.');
    }

    await page.getByPlaceholder('Type RESOLVE').fill('RESOLVE');
    const isDisabledAfter = await executeButton.isDisabled();
    if (isDisabledAfter) {
      throw new Error('Execute button harus enabled setelah input RESOLVE.');
    }

    // Non-destructive smoke: do not execute bulk action.
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();

    console.log(`SMOKE_OK baseUrl=${baseUrl} status=${selectedStatus} ticket=${firstTicketNumber}`);
    console.log('SMOKE_OK validated: open modal step1 -> step2 -> RESOLVE gate -> cancel');
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error('SMOKE_FAILED', error);
  process.exitCode = 1;
});
