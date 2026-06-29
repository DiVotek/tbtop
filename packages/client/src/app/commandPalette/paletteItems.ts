import { router } from "@inertiajs/react";
import type { NavGroup } from "../chromeContext";
import { getPaletteCommand } from "./handlers";
import type { CommandPaletteData, PaletteCommand, PaletteItem } from "./types";

const EXTERNAL_URL = /^[a-z][a-z0-9+.-]*:\/\//i;

function runCommand(cmd: PaletteCommand): () => void {
	if (cmd.handler) {
		const name = cmd.handler;
		return () => {
			void getPaletteCommand(name)?.();
		};
	}
	const href = cmd.href;
	if (!href) {
		return () => {};
	}
	if (cmd.newTab) {
		return () => {
			window.open(href, "_blank", "noopener");
		};
	}
	if (EXTERNAL_URL.test(href)) {
		return () => {
			window.location.assign(href);
		};
	}
	return () => {
		router.visit(href);
	};
}

/** Flatten gate-filtered nav destinations + custom commands into runnable items. */
export function buildPaletteItems(nav: NavGroup[], data: CommandPaletteData): PaletteItem[] {
	const items: PaletteItem[] = [];
	if (data.includeNav !== false) {
		for (const group of nav) {
			items.push(
				...group.items.map(
					(item): PaletteItem => ({
						id: `nav:${item.href}`,
						label: item.label,
						group: group.group,
						icon: item.icon,
						keywords: [],
						run: () => {
							router.visit(item.href);
						},
					}),
				),
			);
		}
	}
	(data.commands ?? []).forEach((cmd, i) => {
		items.push({
			id: `cmd:${cmd.handler ?? cmd.href ?? i}`,
			label: cmd.label,
			group: cmd.group,
			icon: cmd.icon,
			keywords: cmd.keywords ?? [],
			run: runCommand(cmd),
		});
	});
	return items;
}

/** Case-insensitive substring match on label + keywords; empty query = all. */
export function filterPaletteItems(items: PaletteItem[], query: string): PaletteItem[] {
	const q = query.trim().toLowerCase();
	if (!q) {
		return items;
	}
	return items.filter(
		(item) =>
			item.label.toLowerCase().includes(q) ||
			item.keywords.some((k) => k.toLowerCase().includes(q)),
	);
}
