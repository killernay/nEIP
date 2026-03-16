/**
 * auth.ts
 * Shared helpers for E2E tests.
 *
 * Since the Playwright config uses `storageState`, every test page starts
 * with the browser localStorage already populated with a valid auth token.
 * The `login()` helper simply navigates to the dashboard and waits for the
 * protected layout to confirm hydration.
 */
import { type Page } from '@playwright/test';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export const BASE_URL = 'http://localhost:3100';
export const API_URL = 'http://localhost:5400';
export const SCREENSHOTS_DIR = 'apps/web/test-results/screenshots';

export const CREDENTIALS = {
  email: 'admin@neip.app',
  password: 'SecurePass12345',
};

// ---------------------------------------------------------------------------
// login() — navigate to dashboard using the pre-seeded storageState.
// Since storageState is set in playwright.e2e.config.ts, every page starts
// with localStorage already populated. We just need to navigate to dashboard
// and wait for the protected layout to finish hydrating.
// ---------------------------------------------------------------------------

export async function login(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });

  // Wait for hydration spinner to clear
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    const spinning = await page.locator('.animate-spin').isVisible().catch(() => false);
    if (!spinning) break;
    await page.waitForTimeout(300);
  }

  // If we were redirected to login, storageState hydration failed
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    throw new Error(
      '[login] Redirected to /login — storageState may have expired. ' +
        'Delete apps/web/test-results/.auth-storage-state.json and re-run.',
    );
  }

  // Wait for at least some content to confirm the page rendered
  await page
    .waitForSelector('h1, nav, aside, [class*="sidebar"]', { timeout: 20000 })
    .catch(() => {
      // Non-critical — some pages may not have h1 immediately
    });
}

// ---------------------------------------------------------------------------
// uiLogin() — uses the real login form for auth.spec.ts tests.
// ---------------------------------------------------------------------------

export async function uiLogin(page: Page): Promise<void> {
  // Clear existing auth state first so the login form actually runs
  await page.evaluate(() => {
    localStorage.removeItem('neip-auth-token');
    localStorage.removeItem('neip-auth');
  }).catch(() => {});

  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.fill('#email', CREDENTIALS.email);
  await page.fill('#password', CREDENTIALS.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 25000 });
}

// ---------------------------------------------------------------------------
// screenshot()
// ---------------------------------------------------------------------------

export async function screenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `${SCREENSHOTS_DIR}/${name}`,
    fullPage: true,
  });
}

// ---------------------------------------------------------------------------
// goTo() — navigate using Next.js client-side routing when possible.
// ---------------------------------------------------------------------------

export async function goTo(page: Page, path?: string): Promise<void> {
  const currentUrl = page.url();
  const isOnApp =
    currentUrl.startsWith(BASE_URL) &&
    !currentUrl.includes('/login') &&
    !currentUrl.includes('/onboarding');

  if (isOnApp && currentUrl !== `${BASE_URL}${path}`) {
    // Client-side navigation via Next.js App Router
    await page.evaluate((p) => {
      window.history.pushState({}, '', p);
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    }, path);

    await page.waitForTimeout(300);

    // Wait for URL to update
    await page
      .waitForURL(`**${path}**`, { timeout: 10000 })
      .catch(async () => {
        // Fallback: full page load
        await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      });
  } else {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  }

  // Wait for hydration spinner to disappear
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    const spinning = await page.locator('.animate-spin').isVisible().catch(() => false);
    if (!spinning) break;
    await page.waitForTimeout(300);
  }

  // Guard: check we're still on the app (not redirected to login)
  const finalUrl = page.url();
  if (finalUrl.includes('/login')) {
    throw new Error(`[goTo] Redirected to /login after navigating to ${path}`);
  }

  // Wait for data fetches
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------------------
// Exported for legacy use in auth.spec.ts (reads token file for reference)
// ---------------------------------------------------------------------------

const TOKEN_FILE = join(process.cwd(), 'apps/web/test-results/.auth-token.json');

export function readCachedToken(): string | null {
  if (!existsSync(TOKEN_FILE)) return null;
  try {
    const data = JSON.parse(readFileSync(TOKEN_FILE, 'utf-8')) as { token: string };
    return data.token;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// reinjectAuth() — re-populates localStorage with auth when Zustand hydration
// has failed (spinner stuck). Reads the cached token from disk, injects it,
// then reloads so the protected layout can re-read it.
// ---------------------------------------------------------------------------

export async function reinjectAuth(page: Page, path?: string): Promise<void> {
  if (!existsSync(TOKEN_FILE)) {
    throw new Error('[reinjectAuth] Token file not found — run global-setup first');
  }

  interface TokenData {
    token: string;
    tenantId: string;
    userId: string;
  }

  // Read the token from disk — the global-setup ensures it's fresh (< 1 hour old)
  const data = JSON.parse(readFileSync(TOKEN_FILE, 'utf-8')) as TokenData;

  const authState = {
    state: {
      user: {
        id: data.userId,
        name: 'admin',
        email: 'admin@neip.app',
        role: 'owner',
        orgId: data.tenantId,
        orgName: 'nEIP Test Org',
        onboardingComplete: true,
      },
      token: data.token,
      tenantId: data.tenantId,
    },
    version: 0,
  };

  // Inject into localStorage and attempt to update the running Zustand store
  // by dispatching a storage event (cross-tab sync mechanism).
  await page.evaluate(
    ({ token, authJson }) => {
      localStorage.setItem('neip-auth-token', token);
      localStorage.setItem('neip-auth', authJson);
      // Dispatch storage event to trigger Zustand persist re-sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'neip-auth',
        newValue: authJson,
        storageArea: localStorage,
      }));
    },
    { token: data.token, authJson: JSON.stringify(authState) },
  );

  // Brief pause to let React re-render with new store state
  await page.waitForTimeout(500);

  // Check if spinner cleared without reload
  const fastDeadline = Date.now() + 3000;
  let cleared = false;
  while (Date.now() < fastDeadline) {
    const spinning = await page.locator('.animate-spin').isVisible().catch(() => false);
    if (!spinning) { cleared = true; break; }
    await page.waitForTimeout(200);
  }

  if (!cleared) {
    // StorageEvent didn't work — fall back to page.reload() (reloads current page)
    // This avoids re-triggering Next.js compilation since the route is already loaded.
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Wait for spinner to clear after reload
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      const spinning = await page.locator('.animate-spin').isVisible().catch(() => false);
      if (!spinning) break;
      await page.waitForTimeout(200);
    }
  }
}

// ---------------------------------------------------------------------------
// visitPage() — navigate to a page, wait for spinner, optionally re-inject
// auth if the spinner is stuck (Zustand hydration failure recovery).
// Returns a status object used by all spec files.
// ---------------------------------------------------------------------------

export interface PageStatus {
  hasError: boolean;
  hasTable: boolean;
  hasEmpty: boolean;
  hasHeading: boolean;
  stillSpinning: boolean;
  hasCard: boolean;
}

export async function visitPage(
  page: Page,
  path?: string,
  screenshotName: string,
  emptyMessages: string[] = [],
): Promise<PageStatus> {
  mkdirSync(join(process.cwd(), SCREENSHOTS_DIR), { recursive: true });

  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });

  // Phase 1: Wait for React to render (JS bundle executes after domcontentloaded).
  // We wait until we see EITHER the auth spinner OR actual page content.
  // Timeout: 60s (allows for cold Next.js compilation).
  const reactRenderDeadline = Date.now() + 60000;
  let reactRendered = false;
  while (Date.now() < reactRenderDeadline) {
    const spinning = await page.locator('.animate-spin').isVisible().catch(() => false);
    const hasContent = await page.locator('h1, h2, nav, aside, table, [role="main"]').first().isVisible().catch(() => false);
    if (spinning || hasContent) { reactRendered = true; break; }
    await page.waitForTimeout(300);
  }

  if (!reactRendered) {
    // Page is still blank after 60s — likely still compiling, try reinjectAuth
    await reinjectAuth(page, path);
  } else {
    // Phase 2: React has rendered. If spinner visible, wait for it to clear.
    // The auth spinner (Zustand hydration guard) clears within ~100ms once
    // auth is confirmed. If it persists > 15s, auth hydration failed — reinject.
    // NOTE: A visible h1/nav means content is showing — spinner may be a DATA
    // loading indicator, not the auth guard. In that case skip reinject.
    const spinnerDeadline = Date.now() + 15000;
    let spinnerCleared = false;
    while (Date.now() < spinnerDeadline) {
      const spinning = await page.locator('.animate-spin').isVisible().catch(() => false);
      if (!spinning) { spinnerCleared = true; break; }
      // If we can already see page content, auth is fine — spinner is data loading
      const hasPageContent = await page.locator('h1, h2').first().isVisible().catch(() => false);
      if (hasPageContent) { spinnerCleared = true; break; }
      await page.waitForTimeout(300);
    }

    if (!spinnerCleared) {
      // Auth spinner persisted after React rendered — reinject
      await reinjectAuth(page, path);
    }
  }

  // Phase 3: Final spinner wait (60s)
  const finalDeadline = Date.now() + 60000;
  while (Date.now() < finalDeadline) {
    const spinning = await page.locator('.animate-spin').isVisible().catch(() => false);
    if (!spinning) break;
    // If page content is visible alongside spinner, auth is OK — stop waiting
    const hasPageContent = await page.locator('h1, h2').first().isVisible().catch(() => false);
    if (hasPageContent) break;
    await page.waitForTimeout(300);
  }

  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(800);

  const hasError = await page.locator('h2:has-text("Something went wrong")').isVisible().catch(() => false);
  const hasTable = await page.locator('table').first().isVisible().catch(() => false);
  let hasEmpty = false;
  for (const msg of emptyMessages) {
    hasEmpty = hasEmpty || (await page.locator(`text=${msg}`).first().isVisible().catch(() => false));
  }
  const hasHeading = await page.locator('h1').first().isVisible().catch(() => false);
  // stillSpinning is only true when the auth guard spinner is blocking the page.
  // If h1/h2 heading is visible, auth succeeded and any remaining spinner is
  // a data-loading indicator — report stillSpinning as false in that case.
  const rawSpinning = await page.locator('.animate-spin').isVisible().catch(() => false);
  const hasAnyHeading = await page.locator('h1, h2').first().isVisible().catch(() => false);
  const stillSpinning = rawSpinning && !hasAnyHeading;
  const hasCard = await page.locator('[class*="rounded-lg"]').first().isVisible().catch(() => false);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshotName}`, fullPage: true });
  return { hasError, hasTable, hasEmpty, hasHeading, stillSpinning, hasCard };
}
