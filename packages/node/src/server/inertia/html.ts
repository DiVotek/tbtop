import type { InertiaPage, RootView } from "./protocol";

/** The boot markup `createInertiaApp` reads (`@inertia` in Blade). */
export function pageTag(page: InertiaPage, id = "app"): string {
	const json = JSON.stringify(page).replaceAll("<", "\\u003c");
	return `<script data-page="${id}" type="application/json">${json}</script><div id="${id}"></div>`;
}

const escapeHtml = (text: string) =>
	text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");

/**
 * Resolves the stored theme before paint, so the panel never flashes light:
 * the `tbtop_theme` cookie the client writes, else the panel's default theme.
 * A panel with dark mode off stays light whatever the cookie says.
 */
const themeScript = (fallback: string, darkMode: boolean) =>
	"<script>(function(){" +
	"var m=document.cookie.match(/(?:^|;\\s*)tbtop_theme=([^;]*)/);" +
	`var t=${darkMode ? `m?m[1]:${JSON.stringify(fallback).replaceAll("<", "\\u003c")}` : '"light"'};` +
	"var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);" +
	"document.documentElement.classList.toggle('dark',d);" +
	"})();</script>";

interface ShellLook {
	locale?: unknown;
	appearance?: { stylePreset?: unknown; defaultTheme?: unknown; darkMode?: unknown } | null;
}

/** What the admin.blade.php stub reads off the panel: lang, style preset class, theme. */
function shellLook(page: InertiaPage) {
	const tbtop = (page.props.tbtop ?? {}) as ShellLook;
	const appearance = tbtop.appearance ?? {};
	const preset = typeof appearance.stylePreset === "string" ? appearance.stylePreset : "vega";
	const theme = typeof appearance.defaultTheme === "string" ? appearance.defaultTheme : "system";
	return {
		locale: typeof tbtop.locale === "string" ? tbtop.locale : undefined,
		presetClass: `style-preset-${preset.replaceAll(/[^a-z]/g, "")}`,
		theme,
		darkMode: appearance.darkMode !== false,
	};
}

/**
 * A minimal root document, as the PHP install stub: `<html>` carries the
 * locale and the style preset class, the theme resolves before paint, then
 * the host's `<head>` tags (assets, fonts) and the page.
 */
export function rootView(options: { head?: string; lang?: string } = {}): RootView {
	return (page) => {
		const title = typeof page.props.title === "string" ? escapeHtml(page.props.title) : "";
		const look = shellLook(page);
		const lang = escapeHtml((options.lang ?? look.locale ?? "en").replaceAll("_", "-"));
		return [
			"<!DOCTYPE html>",
			`<html lang="${lang}" class="${look.presetClass}">`,
			'<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
			themeScript(look.theme, look.darkMode),
			`<title>${title}</title>${options.head ?? ""}</head>`,
			`<body class="font-sans antialiased">${pageTag(page)}</body>`,
			"</html>",
		].join("");
	};
}

interface ManifestChunk {
	file: string;
	css?: string[];
	imports?: string[];
}

export type ViteManifest = Record<string, ManifestChunk>;

export interface ViteOptions {
	entry: string;
	/** The Vite dev server origin, e.g. `http://localhost:5173`; omit in production. */
	devServer?: string;
	manifest?: ViteManifest;
	/** Public path of the build output; default `/build/`. */
	base?: string;
}

/** `@viteReactRefresh` + `@vite(entry)`: dev-server scripts, or the built files from the manifest. */
export function viteTags(options: ViteOptions): string {
	if (options.devServer !== undefined) {
		return devTags(options.devServer, options.entry);
	}
	if (options.manifest === undefined) {
		throw new TypeError("viteTags() needs either devServer or manifest.");
	}
	return buildTags(options.manifest, options.entry, options.base ?? "/build/");
}

function devTags(origin: string, entry: string): string {
	const refresh = [
		`import RefreshRuntime from "${origin}/@react-refresh";`,
		"RefreshRuntime.injectIntoGlobalHook(window);",
		"window.$RefreshReg$ = () => {};",
		"window.$RefreshSig$ = () => (type) => type;",
		"window.__vite_plugin_react_preamble_installed__ = true;",
	].join("");
	return [
		`<script type="module">${refresh}</script>`,
		`<script type="module" src="${origin}/@vite/client"></script>`,
		`<script type="module" src="${origin}/${entry}"></script>`,
	].join("");
}

function buildTags(manifest: ViteManifest, entry: string, base: string): string {
	const chunk = manifest[entry];
	if (chunk === undefined) {
		throw new TypeError(`"${entry}" is not in the Vite manifest.`);
	}
	const imported = (chunk.imports ?? []).flatMap((key) => manifest[key] ?? []);
	const css = [chunk, ...imported].flatMap((c) => c.css ?? []);
	return [
		...css.map((file) => `<link rel="stylesheet" href="${base}${file}">`),
		...imported.map((c) => `<link rel="modulepreload" href="${base}${c.file}">`),
		`<script type="module" src="${base}${chunk.file}"></script>`,
	].join("");
}
