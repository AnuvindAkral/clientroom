// Captures the screens used in the README. Requires a running server and a
// Chrome for Testing build; set BASE to point at another origin.
//   BASE=https://clientroom.up.railway.app node tools/screenshots.mjs
import { chromium } from '@playwright/test';

const exe =
  process.env.CHROME_PATH ??
  process.env.HOME +
    '/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const base = process.env.BASE ?? 'http://localhost:4123';
const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

await page.goto(base + '/login');
await page.waitForTimeout(600);
await page.screenshot({ path: '.shots/01-login.png' });

const email = 'shoot' + Date.now() + '@studio.test';
await page.goto(base + '/signup');
await page.locator('#email').fill(email);
await page.locator('#password').fill('correct-horse');
await page.screenshot({ path: '.shots/02-signup.png' });
await page.getByRole('button', { name: 'Create account' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: '.shots/03-projects-empty.png' });

await page.locator('#project-title').fill('Acme brand refresh');
await page.locator('#project-description').fill('Logo, brand guide and a social kit. Kickoff was 4 November.');
await page.getByRole('button', { name: 'Create project' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: '.shots/04-project-empty.png' });

const add = async (title, status, due) => {
  const field = page.getByLabel('New deliverable title');
  if (!(await field.count())) await page.getByRole('button', { name: '+ Add deliverable' }).click();
  await field.fill(title);
  await page.getByLabel('New deliverable status').selectOption(status);
  if (due) await page.getByLabel('New deliverable due date').fill(due);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.waitForTimeout(250);
};
await add('Logo suite', 'done', '2026-11-05');
await add('Brand guide', 'in_progress', '2026-11-20');
await add('Social kit', 'not_started', '2026-12-02');
await add('Print pack', 'blocked', '2026-11-14');
await page.getByRole('button', { name: 'Done' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: '.shots/05-project-full.png' });

await page.getByRole('button', { name: 'Client link' }).click();
await page.getByRole('button', { name: 'Create client link' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: '.shots/06-share-panel.png' });
const url = await page.getByLabel('Client link URL').inputValue();

const client = await browser.newContext({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2 });
const cp = await client.newPage();
await cp.goto(url);
await cp.waitForTimeout(700);
await cp.screenshot({ path: '.shots/07-client-page.png', fullPage: true });
await client.close();

await page.goto(base + '/settings/claude');
await page.getByRole('button', { name: 'Create credential' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: '.shots/08-settings-reveal.png' });
await page.reload();
await page.waitForTimeout(500);
await page.screenshot({ path: '.shots/09-settings-credential.png' });

await page.goto(base + '/');
await page.waitForTimeout(500);
await page.screenshot({ path: '.shots/10-projects-list.png' });

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const mp = await mobile.newPage();
await mp.goto(base + '/login');
await mp.locator('#email').fill(email);
await mp.locator('#password').fill('correct-horse');
await mp.getByRole('button', { name: 'Sign in' }).click();
await mp.waitForTimeout(600);
await mp.getByRole('link', { name: 'Acme brand refresh' }).first().click();
await mp.waitForTimeout(700);
await mp.screenshot({ path: '.shots/11-mobile-detail.png' });
await mobile.close();

await browser.close();
console.log('done');
