import { describe, expect, mock, spyOn, test } from "bun:test";
import { router } from "@inertiajs/react";
import type { NavGroup } from "../chromeContext";
import { definePaletteCommand } from "./handlers";
import { buildPaletteItems, filterPaletteItems } from "./paletteItems";
import type { CommandPaletteData } from "./types";

const NAV: NavGroup[] = [
	{ group: "Overview", items: [{ label: "Dashboard", href: "/admin", icon: { name: "star" } }] },
	{
		group: "Content",
		items: [
			{ label: "Posts", href: "/admin/posts" },
			{ label: "Brands", href: "/admin/brands" },
		],
	},
];

describe("buildPaletteItems", () => {
	test("flattens nav groups into runnable items", () => {
		const items = buildPaletteItems(NAV, { hotkey: "mod+k" });
		expect(items.map((i) => i.label)).toEqual(["Dashboard", "Posts", "Brands"]);
		expect(items[0]).toMatchObject({
			id: "nav:/admin",
			group: "Overview",
			icon: { name: "star" },
		});
	});

	test("excludes nav destinations when includeNav is false", () => {
		const data: CommandPaletteData = {
			hotkey: "mod+k",
			includeNav: false,
			commands: [{ label: "Docs", href: "/docs" }],
		};
		expect(buildPaletteItems(NAV, data).map((i) => i.label)).toEqual(["Docs"]);
	});

	test("maps custom commands with group, icon and keywords", () => {
		const data: CommandPaletteData = {
			hotkey: "mod+k",
			includeNav: false,
			commands: [
				{
					label: "Create",
					href: "/new",
					group: "Actions",
					icon: { name: "file-text" },
					keywords: ["add"],
				},
			],
		};
		expect(buildPaletteItems(NAV, data)[0]).toMatchObject({
			label: "Create",
			group: "Actions",
			icon: { name: "file-text" },
			keywords: ["add"],
		});
	});

	test("a nav item run navigates via the Inertia router", () => {
		const visit = spyOn(router, "visit").mockImplementation(() => {});
		buildPaletteItems(NAV, { hotkey: "mod+k" })[0]?.run();
		expect(visit).toHaveBeenCalledWith("/admin");
		visit.mockRestore();
	});

	test("a handler command run invokes the registered client handler", () => {
		const handler = mock(() => {});
		definePaletteCommand("ping", handler);
		const data: CommandPaletteData = {
			hotkey: "mod+k",
			includeNav: false,
			commands: [{ label: "Ping", handler: "ping" }],
		};
		buildPaletteItems(NAV, data)[0]?.run();
		expect(handler).toHaveBeenCalled();
	});

	test("a rejecting async handler is caught and logged, not left unhandled", async () => {
		const error = new Error("boom");
		definePaletteCommand("failing", async () => {
			throw error;
		});
		const consoleError = spyOn(console, "error").mockImplementation(() => {});
		const data: CommandPaletteData = {
			hotkey: "mod+k",
			includeNav: false,
			commands: [{ label: "Fails", handler: "failing" }],
		};
		buildPaletteItems(NAV, data)[0]?.run();
		await Promise.resolve();
		await Promise.resolve();
		expect(consoleError).toHaveBeenCalledWith(
			"[command-palette] handler error",
			"failing",
			error,
		);
		consoleError.mockRestore();
	});
});

describe("filterPaletteItems", () => {
	const items = buildPaletteItems(NAV, {
		hotkey: "mod+k",
		includeNav: false,
		commands: [
			{ label: "Create post", href: "/new", keywords: ["draft"] },
			{ label: "Settings", href: "/settings" },
		],
	});

	test("an empty query returns everything", () => {
		expect(filterPaletteItems(items, "")).toHaveLength(2);
	});

	test("matches on a case-insensitive label substring", () => {
		expect(filterPaletteItems(items, "POST").map((i) => i.label)).toEqual(["Create post"]);
	});

	test("matches on keywords", () => {
		expect(filterPaletteItems(items, "draft").map((i) => i.label)).toEqual(["Create post"]);
	});
});
