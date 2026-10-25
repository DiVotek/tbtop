import { chromium } from '/Users/maxboiko/Desktop/projects/parity-shots/tbtop/apps/demo/node_modules/@playwright/test/index.mjs';
const [base, login, ...paths] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage();
if (login.startsWith('url:')) await p.goto(base + login.slice(4));
else { const [, e, pw, lp] = login.split('|'); await p.goto(base + lp); await p.waitForLoadState('networkidle');
  await p.fill('input[type=email], #email, input[name=email]', e); await p.fill('input[type=password]', pw);
  await Promise.all([p.waitForURL(u => !u.pathname.endsWith('/login')), p.click('button[type=submit]')]); }
await p.waitForLoadState('networkidle'); console.log('after login', p.url());
for (const path of paths) { await p.goto(base + path); await p.waitForLoadState('networkidle'); await p.waitForTimeout(800);
  console.log('==', path, p.url()); console.log([...new Set(await p.$$eval('a[href]', as => as.map(a => a.getAttribute('href'))))].filter(h => /edit|layout\//.test(h)).slice(0, 12).join('\n')); }
await b.close();
