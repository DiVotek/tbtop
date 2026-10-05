/** Radix-shaped hooks that `ResponsiveDialogContent` still accepts from consumers. */
export type ContentDismissHooks = {
	onEscapeKeyDown?: (event: KeyboardEvent) => void;
	onPointerDownOutside?: (event: Event) => void;
	onInteractOutside?: (event: Event) => void;
};

export type DismissRules = {
	dismissible: boolean;
	preventOutside: boolean;
};

type CloseRequest = { reason: string; event: Event };

type BlockRule = (event: Event, rules: DismissRules, hooks: ContentDismissHooks) => boolean;

function isPreventedBy(hooks: Array<((event: Event) => void) | undefined>, event: Event): boolean {
	for (const hook of hooks) {
		hook?.(event);
	}
	return event.defaultPrevented;
}

const blockIfNotDismissible: BlockRule = (_event, rules) => !rules.dismissible;

const BLOCK_RULES: Record<string, BlockRule> = {
	"escape-key": (event, rules, hooks) => {
		// A Radix layer above the dialog prevents the Escape it consumes.
		if (!rules.dismissible || event.defaultPrevented) {
			return true;
		}
		if (event instanceof KeyboardEvent) {
			hooks.onEscapeKeyDown?.(event);
		}
		return event.defaultPrevented;
	},
	"outside-press": (event, rules, hooks) => {
		// An open Radix layer disables body pointer events, so its dismissing
		// press lands on <html>; that press belongs to the layer, not the dialog.
		const { target } = event;
		const isOnRoot =
			target instanceof Element && target === target.ownerDocument.documentElement;
		return (
			rules.preventOutside ||
			isOnRoot ||
			isPreventedBy([hooks.onPointerDownOutside, hooks.onInteractOutside], event)
		);
	},
	"focus-out": (event, rules, hooks) =>
		rules.preventOutside || isPreventedBy([hooks.onInteractOutside], event),
	"close-press": blockIfNotDismissible,
	"close-watcher": blockIfNotDismissible,
	swipe: blockIfNotDismissible,
};

/**
 * Whether Base UI's close request must be cancelled. Mirrors the old Radix/vaul
 * rules: a non-dismissible surface only closes through its controlled `open`.
 */
export function isCloseBlocked(
	request: CloseRequest,
	rules: DismissRules,
	hooks: ContentDismissHooks,
): boolean {
	return BLOCK_RULES[request.reason]?.(request.event, rules, hooks) ?? false;
}

/** Runs a Radix-style auto-focus hook; `false` tells Base UI to leave focus alone. */
export function runAutoFocusHook(hook: (event: Event) => void): boolean {
	const event = new Event("revola.autoFocus", { cancelable: true });
	hook(event);
	return !event.defaultPrevented;
}
