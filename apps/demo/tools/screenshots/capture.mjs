#!/usr/bin/env bun
// Usage: CLAUDE.md → PRs → Screenshots.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { PNG } from 'pngjs';

const { values: opts, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        steps: { type: 'string' },
        as: { type: 'string', default: 'admin@admin.com' },
        password: { type: 'string', default: 'password' },
        base: { type: 'string', default: 'http://127.0.0.1:8000' },
        out: { type: 'string', default: resolve(dirname(fileURLToPath(import.meta.url)), '../../screenshots') },
        width: { type: 'string', default: '1440' },
        height: { type: 'string', default: '900' },
        theme: { type: 'string', default: 'light' },
        'frame-ms': { type: 'string', default: '1200' },
    },
});

const [name, path] = positionals;
if (!name || !path?.startsWith('/')) {
    console.error('usage: capture.mjs <name> </path> [--steps file.mjs] [--as email] [--base url] [--theme light|dark]');
    process.exit(2);
}

const viewport = { width: Number(opts.width), height: Number(opts.height) };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport, deviceScaleFactor: opts.steps ? 1 : 2, colorScheme: opts.theme });

await signIn(page);
await page.goto(opts.base + path, { waitUntil: 'networkidle' });
await settle(page);

mkdirSync(opts.out, { recursive: true });

if (!opts.steps) {
    const file = `${opts.out}/${name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
} else {
    const run = (await import(pathToFileURL(resolve(opts.steps)).href)).default;
    const frames = [];
    const frame = async () => {
        await settle(page);
        frames.push(PNG.sync.read(await page.screenshot()));
    };

    await frame();
    await run(page, frame);

    const gif = GIFEncoder();
    for (const { data, width, height } of frames) {
        const palette = quantize(data, 256);
        gif.writeFrame(applyPalette(data, palette), width, height, { palette, delay: Number(opts['frame-ms']) });
    }
    gif.finish();

    const file = `${opts.out}/${name}.gif`;
    writeFileSync(file, gif.bytes());
    console.log(`${file} (${frames.length} frames)`);
}

await browser.close();

// The demo has no dev-only sign-in route, so drive the real panel login form.
async function signIn(page) {
    await page.goto(`${opts.base}/admin/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', opts.as);
    await page.fill('#password', opts.password);
    await Promise.all([page.waitForURL((url) => url.pathname !== '/admin/login'), page.click('button[type="submit"]')]);
}

// Inertia swaps pages after networkidle; an earlier frame shows the old screen.
async function settle(page) {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
}
