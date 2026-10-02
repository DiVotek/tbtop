#!/usr/bin/env bun
// Usage: CLAUDE.md → PRs → Screenshots.
// Add-then-drop commits: the squash nets to nothing on main, refs/pull/<n>/head keeps the links alive.
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../screenshots');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

const root = git('rev-parse', '--show-toplevel');
const files = (process.argv.length > 2 ? process.argv.slice(2).map((f) => resolve(f)) : listShots())
    .map((f) => relative(root, f));

if (files.length === 0) {
    console.error(`no screenshots in ${relative(root, dir)}; run capture.mjs first`);
    process.exit(2);
}

git('-C', root, 'add', '--', ...files);
git('-C', root, 'commit', '-q', '-m', 'chore(screenshots): attach PR screenshots', '--', ...files);
const sha = git('-C', root, 'rev-parse', 'HEAD');
git('-C', root, 'rm', '-q', '--', ...files);
git('-C', root, 'commit', '-q', '-m', 'chore(screenshots): drop PR screenshots', '--', ...files);

const slug = git('-C', root, 'remote', 'get-url', 'origin').replace(/^.*github\.com[:/]/, '').replace(/\.git$/, '');
for (const file of files) {
    console.log(`![${basename(file)}](https://github.com/${slug}/blob/${sha}/${file}?raw=true)`);
}
console.error('\nPush the branch for the links to resolve. Do not rebase past these two commits.');

function listShots() {
    return readdirSync(dir)
        .filter((f) => /\.(png|gif)$/.test(f))
        .map((f) => resolve(dir, f));
}
