// Clipboard write with a fallback for non-secure contexts (plain HTTP),
// where navigator.clipboard is undefined. Mirrors the safeUuid approach.
export async function copyToClipboard(text: string): Promise<boolean> {
	if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch {
			// secure-context API present but blocked; fall through to legacy path
		}
	}
	return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
	if (typeof document === "undefined") {
		return false;
	}
	const el = document.createElement("textarea");
	el.value = text;
	el.setAttribute("readonly", "");
	el.style.position = "fixed";
	el.style.left = "-9999px";
	document.body.append(el);
	el.select();
	let ok = false;
	try {
		ok = document.execCommand("copy");
	} catch {
		ok = false;
	}
	el.remove();
	return ok;
}
