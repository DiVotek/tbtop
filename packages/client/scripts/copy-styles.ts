// Ships the CSS raw — it's Tailwind v4 source (@import "tailwindcss"), the
// consumer compiles it through their own pipeline. Entries (styles.css,
// styles/<name>.css) and the files they import keep their relative layout;
// core.css gets its @source glob pointed at the shipped .js next to it.
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { Glob } from "bun";

const src = `${import.meta.dir}/../src`;
const out = `${import.meta.dir}/../dist`;
const files = [
	"core.css",
	"styles.css",
	...new Glob("styles/*.css").scanSync(src),
	...new Glob("ui/presets/*.css").scanSync(src),
];

for (const file of files) {
	const css = await Bun.file(`${src}/${file}`).text();
	const shipped =
		file === "core.css"
			? css.replace('@source "./**/*.{ts,tsx}";', '@source "./**/*.{js,ts,tsx}";')
			: css;
	await mkdir(dirname(`${out}/${file}`), { recursive: true });
	await Bun.write(`${out}/${file}`, shipped);
}
