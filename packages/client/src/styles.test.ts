import { describe, expect, test } from "bun:test";
import { STYLE_PRESETS } from "./app/appearance";

const dir = import.meta.dir;
const read = (path: string) => Bun.file(`${dir}/${path}`).text();

// Regression: the presets once sat in a layer above `utilities`, so every
// className override (badge colors, compact density) silently lost.
describe("style preset CSS", () => {
	test("styles.css loads every preset in the components layer", async () => {
		const css = await read("styles.css");
		for (const name of STYLE_PRESETS) {
			expect(css).toContain(
				`@import "./ui/presets/style-preset-${name}.css" layer(components);`,
			);
		}
		expect(css).not.toMatch(/layer\((?!components\))/);
	});

	test("each single-style entry loads core plus exactly its preset", async () => {
		for (const name of STYLE_PRESETS) {
			const css = await read(`styles/${name}.css`);
			expect(css).toContain('@import "../core.css";');
			expect(css.match(/style-preset-\w+\.css/g)).toEqual([`style-preset-${name}.css`]);
		}
	});

	test("each preset is scoped under its own class", async () => {
		for (const name of STYLE_PRESETS) {
			const css = await read(`ui/presets/style-preset-${name}.css`);
			expect(css).toContain(`.style-preset-${name} {`);
		}
	});

	test("tbtop alert variants match a preset's scoped .cn-alert specificity", async () => {
		// `.style-preset-X .cn-alert` sets the background (sera); a bare
		// `.cn-alert-variant-*` would lose to it inside the same layer.
		const css = await read("ui/presets/tbtop.css");
		const variants = [...css.matchAll(/^(\.[^\s{]*cn-alert-variant-[\w-]+) \{/gm)].map(
			(m) => m[1],
		);
		expect(variants.length).toBeGreaterThan(0);
		for (const selector of variants) {
			expect(selector).toStartWith(".cn-alert.");
		}
	});

	test("tbtop control heights match each style's input and small select", async () => {
		const tbtop = await read("ui/presets/tbtop.css");
		for (const name of STYLE_PRESETS) {
			const preset = await read(`ui/presets/style-preset-${name}.css`);
			const input = preset.match(/\.cn-input \{([^}]*)\}/)?.[1] ?? "";
			const select = preset.match(/\.cn-select-trigger \{([^}]*)\}/)?.[1] ?? "";
			const block =
				tbtop.match(
					new RegExp(`\\.style-preset-${name} \\{([^}]*--control-h[^}]*)\\}`),
				)?.[1] ?? "";
			const height = input.match(/(?:^|\s)h-(\d+)[\s;]/)?.[1];
			const small = select.match(/data-\[size=sm\]:h-(\d+)/)?.[1];
			expect(block).toContain(`--control-h: calc(var(--spacing) * ${height});`);
			expect(block).toContain(`--control-h-sm: calc(var(--spacing) * ${small});`);
		}
	});

	// PHP validates ->stylePreset() against its own list; it must match the CSS.
	test("PHP accepts exactly the presets the client ships", async () => {
		const php = await read("../../php/src/Panels/Concerns/ConfiguresAppearance.php");
		const list = php.match(/STYLE_PRESETS = \[([^\]]*)\]/)?.[1] ?? "";
		const names = [...list.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
		expect(names).toEqual([...STYLE_PRESETS]);
	});
});
