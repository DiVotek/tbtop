import type { Admin } from "./admin";

/**
 * PanelRegistry: several panels behind one handler, each with its own
 * prefix, pages, session and auth. The longest prefix answers first, so a
 * panel nested under another's prefix still gets its URLs.
 */
export function createPanels(panels: Admin[]) {
	assertUnique(
		panels.map((panel) => panel.id),
		"panel id",
	);
	assertUnique(
		panels.map((panel) => panel.prefix),
		"panel prefix",
	);
	const ordered = panels.toSorted((a, b) => b.prefix.length - a.prefix.length);
	return {
		/** The first panel that owns the URL answers; null when none does. */
		async handle(request: Request): Promise<Response | null> {
			for (const panel of ordered) {
				const response = await panel.handle(request);
				if (response !== null) {
					return response;
				}
			}
			return null;
		},
		get(id: string): Admin {
			const found = panels.find((panel) => panel.id === id);
			if (found === undefined) {
				const known = panels.map((panel) => panel.id).join(", ");
				throw new TypeError(`Unknown panel "${id}". Registered: ${known}.`);
			}
			return found;
		},
		panels,
	};
}

function assertUnique(values: string[], what: string): void {
	const seen = new Set<string>();
	for (const value of values) {
		if (seen.has(value)) {
			throw new TypeError(`Duplicate ${what} "${value}".`);
		}
		seen.add(value);
	}
}
