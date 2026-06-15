// Ships styles.css raw — it's a Tailwind v4 source (@import "tailwindcss"),
// the consumer compiles it through their own pipeline. We only rewrite the
// @source glob so it points at the shipped .js next to dist/styles.css.
import { mkdir } from "node:fs/promises";

const src = `${import.meta.dir}/../src/styles.css`;
const out = `${import.meta.dir}/../dist/styles.css`;

const css = await Bun.file(src).text();
const patched = css.replace('@source "./**/*.{ts,tsx}";', '@source "./**/*.{js,ts,tsx}";');

await mkdir(`${import.meta.dir}/../dist`, { recursive: true });
await Bun.write(out, patched);
