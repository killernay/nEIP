/**
 * global-setup.ts
 * Runs once before all test workers start.
 *
 * 1. Fetches a JWT from the API (bypasses rate limits by doing it just once)
 * 2. Launches a headless browser, sets localStorage, navigates to dashboard
 * 3. Saves the browser storage state to a file that worker tests can reuse
 */
import { chromium, type FullConfig } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const API_URL = 'http://localhost:5400';
const BASE_URL = 'http://localhost:3100';
const TOKEN_FILE = join(process.cwd(), 'apps/web/test-results/.auth-token.json');
const STORAGE_STATE_FILE = join(process.cwd(), 'apps/web/test-results/.auth-storage-state.json');

interface TokenData {
  token: string;
  tenantId: string;
  userId: string;
  fetchedAt: number;
}

function buildAuthState(tokenData: TokenData) {
  return {
    state: {
      user: {
        id: tokenData.userId,
        name: 'admin',
        email: 'admin@neip.app',
        role: 'owner',
        orgId: tokenData.tenantId,
        orgName: 'nEIP Test Org',
        onboardingComplete: true,
      },
      token: tokenData.token,
      tenantId: tokenData.tenantId,
    },
    version: 0,
  };
}

async function injectAuth(page: import('@playwright/test').Page, tokenData: TokenData): Promise<void> {
  const authState = buildAuthState(tokenData);
  await page.evaluate(
    ({ t, authJson }) => {
      localStorage.setItem('neip-auth-token', t);
      localStorage.setItem('neip-auth', authJson);
    },
    { t: tokenData.token, authJson: JSON.stringify(authState) },
  );
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  // Ensure output directories exist
  mkdirSync(join(process.cwd(), 'apps/web/test-results'), { recursive: true });
  mkdirSync(join(process.cwd(), 'apps/web/test-results/screenshots'), { recursive: true });

  // ---------------------------------------------------------------------------
  // Step 1: Fetch a fresh JWT for this test run.
  // ---------------------------------------------------------------------------
  let tokenData: TokenData;
  console.log('[global-setup] Fetching fresh auth token...');

  {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext();
    const res = await ctx.post(`${API_URL}/api/v1/auth/login`, {
      data: { email: 'admin@neip.app', password: 'SecurePass12345' },
    });

    if (!res.ok()) {
      const body = await res.text();
      throw new Error(`[global-setup] Login failed (${res.status()}): ${body}`);
    }

    const body = (await res.json()) as { accessToken: string };
    const token = body.accessToken;
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1]!, 'base64').toString('utf-8'),
    ) as { sub: string; tenantId: string };

    tokenData = {
      token,
      tenantId: payload.tenantId,
      userId: payload.sub,
      fetchedAt: Date.now(),
    };

    writeFileSync(TOKEN_FILE, JSON.stringify(tokenData), 'utf-8');
    console.log('[global-setup] New token fetched and cached');
    await ctx.dispose();
  }

  // ---------------------------------------------------------------------------
  // Step 2: Inject token into a real browser and save storage state.
  // We do this in a separate browser context so that a crash during warm-up
  // does not prevent saving the storage state file.
  // ---------------------------------------------------------------------------
  {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to the app to establish the origin for localStorage
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Inject auth into localStorage
    await injectAuth(page, tokenData);

    // Save storage state immediately — before any warm-up that could crash
    await context.storageState({ path: STORAGE_STATE_FILE });
    console.log(`[global-setup] Storage state saved to ${STORAGE_STATE_FILE}`);

    await browser.close();
    console.log('[global-setup] Auth state browser closed');
  }

  // ---------------------------------------------------------------------------
  // Step 3: Pre-warm key routes in a fresh browser context.
  // Warming triggers Next.js compilation so tests don't time out.
  // Use a fresh browser to ensure warm-up crashes don't affect storage state.
  // ---------------------------------------------------------------------------
  const ROUTES_TO_WARM = [
    '/dashboard',
    '/contacts',
    '/accounts',
    '/reports',
    '/settings',
    '/invoices/new',
    '/products',
    '/bank',
    '/cost-centers',
    '/profit-centers',
    '/employees',
    '/journal-entries',
    '/quotations',
    '/invoices',
    '/payments',
    '/receipts',
  ];

  console.log(`[global-setup] Pre-warming ${ROUTES_TO_WARM.length} routes...`);

  const warmBrowser = await chromium.launch({ headless: true });
  const warmContext = await warmBrowser.newContext({
    storageState: STORAGE_STATE_FILE,
  });

  for (const route of ROUTES_TO_WARM) {
    let page: import('@playwright/test').Page | null = null;
    try {
      page = await warmContext.newPage();
      await page.goto(`${BASE_URL}${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 90000,
      });

      // Wait for spinner to clear — indicates the page compiled and rendered
      const routeDeadline = Date.now() + 45000;
      while (Date.now() < routeDeadline) {
        const spinning = await page.locator('.animate-spin').isVisible().catch(() => false);
        if (!spinning) break;
        await page.waitForTimeout(300);
      }

      await page.close().catch(() => {});
      console.log(`[global-setup] Warmed: ${route}`);
    } catch (err) {
      const msg = String(err).slice(0, 120);
      console.warn(`[global-setup] Warm-up failed (non-fatal): ${route} — ${msg}`);
      await page?.close().catch(() => {});
    }
  }

  await warmBrowser.close().catch(() => {});
  console.log('[global-setup] Route pre-warming complete');
}
