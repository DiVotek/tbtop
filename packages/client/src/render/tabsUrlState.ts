const URL_NS = "tab";

export function seedTabsValue(blockName: string, tabNames: string[]): string | undefined {
	if (typeof window === "undefined") {
		return undefined;
	}
	const value = new URLSearchParams(window.location.search).get(key(blockName));
	return value !== null && tabNames.includes(value) ? value : undefined;
}

export function persistTabsValue(blockName: string, value: string, defaultValue: string): void {
	if (typeof window === "undefined") {
		return;
	}
	const params = new URLSearchParams(window.location.search);
	if (value === defaultValue) {
		params.delete(key(blockName));
	} else {
		params.set(key(blockName), value);
	}
	const query = params.toString();
	const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
	window.history.replaceState(window.history.state, "", url);
}

function key(blockName: string): string {
	return `${URL_NS}[${blockName}]`;
}
