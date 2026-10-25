// usage: node shots.mjs <base> <prefix> <outdir> <theme> <login:form|url:/path> <name=/path>...
import { chromium } from '/Users/maxboiko/Desktop/projects/parity-shots/tbtop/apps/demo/node_modules/@playwright/test/index.mjs';
const [base, prefix, out, theme, login, ...shots] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
const host = new URL(base).hostname;
await ctx.addCookies([{ name: 'tbtop_theme', value: theme, domain: host, path: '/' }]);
const page = await ctx.newPage();
const settle = async () => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(800); };
if (login.startsWith('url:')) { await page.goto(base + login.slice(4)); await settle(); }
else {
  const [, email, pw, path] = login.split('|');
  await page.goto(base + path); await settle();
  await page.fill('input[type=email], #email, input[name=email]', email);
  await page.fill('input[type=password]', pw);
  await Promise.all([page.waitForURL((u) => !u.pathname.endsWith('/login')), page.click('button[type=submit]')]);
  await settle();
}
for (const s of shots) {
  const i0 = s.indexOf("="); const name = s.slice(0, i0); const [path, mode] = s.slice(i0 + 1).split("#");
  await page.goto(base + path); await settle();
  if (mode === 'navcollapse' || mode === 'navexpand') {
    // collapsible groups expose aria-expanded toggles inside the sidebar
    await page.evaluate(() => document.querySelectorAll('[aria-expanded]').forEach(e => { if (e.closest('aside,nav,header')?.tagName === 'NAV') e.setAttribute('data-navtoggle', '1'); }));
    const toggles = page.locator('[data-navtoggle]');
    const n = await toggles.count();
    const want = mode === 'navcollapse' ? 'true' : 'false';
    for (let i = 0; i < n; i++) { const t = toggles.nth(i); if ((await t.getAttribute('aria-expanded')) === want && await t.isVisible()) { await t.click({ timeout: 3000 }).catch((e) => console.log("skip toggle", i)); await page.waitForTimeout(250); } }
    console.log(`${name}: ${n} toggles`);
    await page.screenshot({ path: `${out}/${prefix}-${name}-${theme}.png` });
    continue;
  }
  await page.screenshot({ path: `${out}/${prefix}-${name}-${theme}.png`, fullPage: true });
  console.log(`${prefix}-${name}-${theme}.png ${page.url()}`);
}
await browser.close();
