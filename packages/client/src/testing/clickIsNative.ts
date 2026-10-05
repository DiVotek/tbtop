import { fireEvent } from "@testing-library/react";

/**
 * Clicks `el` and reports whether the browser would follow the link natively,
 * i.e. nothing (Inertia's <Link>) called preventDefault. The probe runs last on
 * document and cancels the real navigation: happy-dom would otherwise move
 * window.location off-origin and skew isExternalUrl for later tests.
 */
export function clickIsNative(el: HTMLElement): boolean {
	let intercepted = true;
	const probe = (e: Event) => {
		intercepted = e.defaultPrevented;
		e.preventDefault();
	};
	document.addEventListener("click", probe);
	try {
		fireEvent.click(el);
	} finally {
		document.removeEventListener("click", probe);
	}
	return !intercepted;
}
