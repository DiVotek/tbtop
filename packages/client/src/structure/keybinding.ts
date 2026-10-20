interface ParsedKeybinding {
	key: string;
	cmd: boolean;
	ctrl: boolean;
	mod: boolean;
	shift: boolean;
	alt: boolean;
}

type ModifierFlag = "cmd" | "ctrl" | "mod" | "shift" | "alt";

// Token → modifier flag. A token not here is the key itself.
const MODIFIER_TOKENS: Record<string, ModifierFlag> = {
	cmd: "cmd",
	meta: "cmd",
	command: "cmd",
	ctrl: "ctrl",
	control: "ctrl",
	mod: "mod",
	shift: "shift",
	alt: "alt",
	opt: "alt",
	option: "alt",
};

export function parseKeybinding(spec: string): ParsedKeybinding | null {
	const parts = spec
		.toLowerCase()
		.split("+")
		.map((p) => p.trim())
		.filter(Boolean);
	if (parts.length === 0) {
		return null;
	}
	const result: ParsedKeybinding = {
		key: "",
		cmd: false,
		ctrl: false,
		mod: false,
		shift: false,
		alt: false,
	};
	for (const part of parts) {
		const flag = MODIFIER_TOKENS[part];
		if (flag) {
			result[flag] = true;
		} else {
			result.key = part;
		}
	}
	return result.key ? result : null;
}

export function matchesKeybinding(spec: ParsedKeybinding, event: KeyboardEvent): boolean {
	if (eventKey(event) !== spec.key) {
		return false;
	}
	if (spec.shift !== event.shiftKey) {
		return false;
	}
	if (spec.alt !== event.altKey) {
		return false;
	}
	const modOk = spec.mod ? event.metaKey || event.ctrlKey : true;
	const cmdOk = spec.mod ? true : spec.cmd === event.metaKey;
	const ctrlOk = spec.mod ? true : spec.ctrl === event.ctrlKey;
	return modOk && cmdOk && ctrlOk;
}

const ASCII_KEY_RE = /^[\x20-\x7e]$/;
const LETTER_OR_DIGIT_CODE_RE = /^(?:Key([A-Z])|Digit([0-9]))$/;

/**
 * The key a binding is compared against. On a non-Latin layout (Cyrillic,
 * Greek) Ctrl/Cmd+S reports a key like "і" that no binding spells, so a
 * non-ASCII key pressed with Ctrl/Cmd falls back to the physical letter/digit
 * from `event.code`. Not with Alt/AltGr: there the key types a real character
 * (Polish AltGr+S → "ś"), and the dispatcher would swallow it. ASCII keys
 * stay layout-aware (Dvorak keeps its letters).
 */
function eventKey(event: KeyboardEvent): string {
	const key = event.key.toLowerCase();
	if (key.length !== 1 || ASCII_KEY_RE.test(key) || !isShortcutChord(event)) {
		return key;
	}
	const match = LETTER_OR_DIGIT_CODE_RE.exec(event.code ?? "");
	const physical = match?.[1] ?? match?.[2];
	return physical ? physical.toLowerCase() : key;
}

function isShortcutChord(event: KeyboardEvent): boolean {
	if (!(event.ctrlKey || event.metaKey) || event.altKey) {
		return false;
	}
	return event.getModifierState?.("AltGraph") !== true;
}

interface Binding {
	spec: ParsedKeybinding;
	fire: () => void;
}

const bindings: Binding[] = [];
let listenerInstalled = false;

export function registerKeybinding(spec: ParsedKeybinding, fire: () => void): () => void {
	const entry: Binding = { spec, fire };
	bindings.push(entry);
	installListener();
	return () => {
		const i = bindings.indexOf(entry);
		if (i >= 0) {
			bindings.splice(i, 1);
		}
	};
}

function installListener(): void {
	if (listenerInstalled || typeof window === "undefined") {
		return;
	}
	listenerInstalled = true;
	window.addEventListener("keydown", dispatchKeydown);
}

// Newest binding wins — iterate in reverse, fire the first match.
function dispatchKeydown(event: KeyboardEvent): void {
	for (let i = bindings.length - 1; i >= 0; i--) {
		const b = bindings[i];
		if (!b || !matchesKeybinding(b.spec, event)) {
			continue;
		}
		event.preventDefault();
		const active = document.activeElement;
		if (active instanceof HTMLElement) {
			active.blur();
		}
		b.fire();
		return;
	}
}
