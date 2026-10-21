/**
 * Blur validation adds or removes the error line under a field. Run during a
 * press, that moves the button being pressed and the click is lost, so it
 * waits for the click the release dispatches.
 */
let pressed = false;
let queued: (() => void)[] = [];
let tracking = false;

/** Idempotent; FormBlock calls it on mount so the first press is already seen. */
export function trackPointerPress(): void {
	if (tracking || typeof document === "undefined") {
		return;
	}
	tracking = true;
	document.addEventListener(
		"pointerdown",
		() => {
			pressed = true;
		},
		true,
	);
	document.addEventListener("pointerup", release, true);
	document.addEventListener("pointercancel", release, true);
}

export function afterPointerRelease(run: () => void): void {
	if (!pressed) {
		run();
		return;
	}
	queued.push(run);
}

function release(): void {
	pressed = false;
	// The click is dispatched right after pointerup; run once it has.
	setTimeout(flush, 0);
}

function flush(): void {
	const runs = queued;
	queued = [];
	for (const run of runs) {
		run();
	}
}
