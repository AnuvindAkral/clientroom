import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PASSWORD = 'correct-horse';

let counter = 0;
function uniqueEmail(prefix = 'e2e'): string {
  counter += 1;
  return `${prefix}.${Date.now()}.${counter}@studio.test`;
}

async function signUp(page: Page, email: string): Promise<void> {
  await page.goto('/signup');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();
}

async function createProject(page: Page, title: string): Promise<void> {
  // The empty workspace opens the form by itself; otherwise the header button
  // opens it. Wait for whichever appears, then use the field.
  const titleField = page.locator('#project-title');
  const newProjectButton = page.getByRole('button', { name: 'New project' });
  await expect(titleField.or(newProjectButton)).toBeVisible();
  if (await titleField.count()) {
    // already open
  } else {
    await newProjectButton.click();
  }
  await titleField.fill(title);
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
}

async function addDeliverable(page: Page, title: string, status?: string): Promise<void> {
  const titleField = page.getByLabel('New deliverable title');
  const openButton = page.getByRole('button', { name: '+ Add deliverable' });
  // The add row stays open after a save, so only open it when it is closed.
  if (!(await titleField.count())) {
    await openButton.click();
  }
  await titleField.fill(title);
  if (status) await page.getByLabel('New deliverable status').selectOption(status);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByLabel(`Deliverable title: ${title}`)).toBeVisible();
}

async function auditPage(page: Page, label: string): Promise<void> {
  // Freeze motion so a fading toast is measured at its resting colour.
  await page.addStyleTag({
    content: '*,*::before,*::after{animation:none!important;transition:none!important}',
  });
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious',
  );
  const detail = serious.flatMap((violation) =>
    violation.nodes.map((node) => `${violation.id} ${node.target.join(' ')}`),
  );
  expect(detail, `accessibility on ${label}`).toEqual([]);
}

/* ------------------------------------------------------------------ */

test('E1-E5 signup, project, deliverable, inline edit, delete', async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, email);

  // An empty workspace opens the first-project form: one action, already focused.
  await expect(page.getByRole('heading', { name: 'New project' })).toBeVisible();
  await expect(page.locator('#project-title')).toBeFocused();

  await createProject(page, 'Acme brand refresh');
  await expect(page.getByRole('heading', { name: 'Nothing listed yet' })).toBeVisible();

  await addDeliverable(page, 'Logo', 'done');
  await addDeliverable(page, 'Brand guide', 'in_progress');

  // Status is reflected in the row select.
  await expect(page.getByLabel('Status for Logo')).toHaveValue('done');

  // Inline title edit persists.
  const titleInput = page.getByLabel('Deliverable title: Brand guide');
  await titleInput.fill('Brand guidelines');
  await titleInput.blur();
  await expect(page.getByLabel('Deliverable title: Brand guidelines')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Deliverable title: Brand guidelines')).toBeVisible();

  // Due date persists.
  const dueInput = page.getByLabel('Due date for Logo');
  await dueInput.fill('2026-12-01');
  await page.waitForTimeout(400);
  await page.reload();
  await expect(page.getByLabel('Due date for Logo')).toHaveValue('2026-12-01');

  // Delete asks once, then removes.
  await page.getByRole('button', { name: 'Delete Logo' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByLabel('Deliverable title: Logo')).toHaveCount(0);
});

test('E6-E8 client link opens without a session and revocation takes effect', async ({
  page,
  browser,
}) => {
  await signUp(page, uniqueEmail('share'));
  await createProject(page, 'Northwind identity');
  await addDeliverable(page, 'Wordmark', 'done');

  await page.getByRole('button', { name: 'Client link' }).click();
  await page.getByRole('button', { name: 'Create client link' }).click();
  const urlField = page.getByLabel('Client link URL');
  await expect(urlField).toBeVisible();
  const url = await urlField.inputValue();
  expect(url).toMatch(/\/s\/[A-Za-z0-9_-]{20,}$/);

  // A private context has no cookies at all.
  const clientContext = await browser.newContext();
  const clientPage = await clientContext.newPage();
  const response = await clientPage.goto(url);
  expect(response?.status()).toBe(200);
  await expect(clientPage.getByRole('heading', { name: 'Northwind identity' })).toBeVisible();
  await expect(clientPage.getByText('Wordmark')).toBeVisible();
  await expect(clientPage.getByText('Done')).toBeVisible();
  // No editing surface, no account prompt.
  await expect(clientPage.getByRole('button')).toHaveCount(0);
  await auditPage(clientPage, 'client page');
  await clientContext.close();

  // Revoke, then the same URL is gone for good.
  await page.getByRole('button', { name: 'Revoke link' }).click();
  await page.getByRole('button', { name: 'Revoke link', exact: true }).last().click();
  await expect(page.getByRole('button', { name: 'Create client link' })).toBeVisible();

  const after = await page.request.get(url);
  expect(after.status()).toBe(410);
});

test('E9 credential is revealed once and only a prefix remains', async ({ page }) => {
  await signUp(page, uniqueEmail('cred'));

  await page.goto('/settings/claude');
  await page.getByRole('button', { name: 'Create credential' }).click();

  const tokenField = page.getByLabel('MCP token');
  await expect(tokenField).toBeVisible();
  const token = await tokenField.inputValue();
  expect(token).toMatch(/^crm_[A-Za-z0-9_-]{20,}$/);
  await expect(page.getByText('Copy this token now')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('MCP token')).toHaveCount(0);
  await expect(page.getByText(`${token.slice(0, 12)}…`)).toBeVisible();

  const full = await page.content();
  expect(full).not.toContain(token);
});

test('E10 keyboard alone completes the first project', async ({ page }) => {
  await signUp(page, uniqueEmail('kbd'));

  // The empty workspace puts the cursor where the next action is.
  await expect(page.locator('#project-title')).toBeFocused();
  await page.locator('#project-title').fill('Keyboard project');
  await page.keyboard.press('Tab');
  await expect(page.locator('#project-description')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Create project' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Keyboard project', level: 1 })).toBeVisible();

  // The skip link is the first thing in the tab order.
  const firstFocusable = await page.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((node) => node.offsetParent !== null || node.className.includes('skip'));
    return nodes[0]?.className ?? '';
  });
  expect(firstFocusable).toContain('skip');

  // Focus is visible rather than implied.
  await page.getByRole('button', { name: 'Rename' }).focus();
  const outline = await page
    .getByRole('button', { name: 'Rename' })
    .evaluate((node) => getComputedStyle(node).outlineStyle);
  expect(outline).toBe('solid');
});

test('E12 no horizontal scroll at 360, 768, 1280 and 1600', async ({ page }) => {
  await signUp(page, uniqueEmail('resp'));
  await createProject(page, 'A long project name that should wrap rather than overflow the layout');
  await addDeliverable(page, 'A deliverable with a fairly long title to stress the row grid');

  for (const width of [360, 768, 1280, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
  }
});

test('Q4 accessibility passes on every screen', async ({ page }) => {
  await signUp(page, uniqueEmail('axe'));
  await auditPage(page, 'projects empty');
  await createProject(page, 'Acme brand refresh');
  await addDeliverable(page, 'Logo', 'done');
  await auditPage(page, 'project detail');

  await page.getByRole('button', { name: 'Client link' }).click();
  await page.getByRole('button', { name: 'Create client link' }).click();
  await expect(page.getByLabel('Client link URL')).toBeVisible();
  await auditPage(page, 'share panel');

  await page.goto('/settings/claude');
  await auditPage(page, 'settings');
});

test('D5 data survives a full reload and a second sign-in', async ({ page }) => {
  const email = uniqueEmail('persist');
  await signUp(page, email);
  await createProject(page, 'Persisted project');
  await addDeliverable(page, 'Persisted deliverable', 'blocked');

  await page.reload();
  await expect(page.getByLabel('Deliverable title: Persisted deliverable')).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('link', { name: 'Persisted project' }).first().click();
  await expect(page.getByLabel('Deliverable title: Persisted deliverable')).toBeVisible();
  await expect(page.getByLabel('Status for Persisted deliverable')).toHaveValue('blocked');
});

test('isolation: a second account cannot see the first account project', async ({ browser }) => {
  const first = await browser.newContext();
  const firstPage = await first.newPage();
  await signUp(firstPage, uniqueEmail('one'));
  await createProject(firstPage, 'First client');
  const projectUrl = firstPage.url();
  await first.close();

  const second = await browser.newContext();
  const secondPage = await second.newPage();
  await signUp(secondPage, uniqueEmail('two'));
  await expect(secondPage.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();
  await expect(
    secondPage.getByRole('link', { name: 'First client' }),
  ).toHaveCount(0);

  await secondPage.goto(projectUrl);
  await expect(secondPage.getByRole('heading', { name: 'That project is not here' })).toBeVisible();
  await second.close();
});
