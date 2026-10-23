import { materialize, S } from "../../dsl";

type Area = (s: S) => unknown;
type Items = (s: S, defaults: unknown[]) => unknown[];

/**
 * Chrome.php as data: the shell authored in the structure DSL. Spread
 * `defaults` in `headerItems` / `sidebarItems` to append to the stock shell;
 * `header` / `sidebar` / `footer` replace an area outright (null hides it).
 *
 * Chrome trees are page-independent: a `.handle()` action has no endpoint to
 * resolve against, so serializing one throws. Use `.url()` or `.custom()`.
 */
export interface ChromeDef {
	header?: Area;
	sidebar?: Area;
	footer?: Area;
	/** Topbar items; default `[s.userMenu()]`. */
	headerItems?: Items;
	/** Sidebar items, top to bottom; default `[s.logo(), s.navMenu()]`. */
	sidebarItems?: Items;
}

function areas(chrome: ChromeDef): Required<Pick<ChromeDef, "header" | "sidebar" | "footer">> {
	const headerItems = chrome.headerItems ?? ((_, defaults) => defaults);
	const sidebarItems = chrome.sidebarItems ?? ((_, defaults) => defaults);
	return {
		header:
			chrome.header ?? ((s) => s.flex(headerItems(s, [s.userMenu()]), { align: "center" })),
		sidebar: chrome.sidebar ?? ((s) => s.stack(sidebarItems(s, [s.logo(), s.navMenu()]))),
		footer: chrome.footer ?? (() => null),
	};
}

/** ChromeSerializer::forPanel(): the three areas of the `tbtop.chrome` prop. */
export async function serializeChrome(chrome: ChromeDef = {}) {
	const { header, sidebar, footer } = areas(chrome);
	const s = new S();
	return {
		header: await area(header(s), "header"),
		sidebar: await area(sidebar(s), "sidebar"),
		footer: await area(footer(s), "footer"),
	};
}

async function area(node: unknown, name: string): Promise<unknown> {
	if (node === null) {
		return null;
	}
	const tree = await materialize(node);
	assertNoServerActions(tree, name);
	return tree;
}

function assertNoServerActions(value: unknown, name: string): void {
	if (value === null || typeof value !== "object") {
		return;
	}
	const node = value as {
		kind?: unknown;
		name?: unknown;
		options?: { spec?: { type?: unknown } };
	};
	if (node.kind === "action" && node.options?.spec?.type === "server") {
		throw new TypeError(
			`Chrome trees are page-independent: server action "${String(node.name ?? "unnamed")}" in chrome.${name} ` +
				"cannot resolve outside a page. Use .url() or .custom() instead of .handle().",
		);
	}
	for (const child of Object.values(value)) {
		assertNoServerActions(child, name);
	}
}
