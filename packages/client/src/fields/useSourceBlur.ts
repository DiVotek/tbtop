import { type RefObject, useEffect, useRef } from "react";

// The chrome wrapper every form field renders in (fieldChrome.tsx), named by
// the field's path: "title" at the top level, "sections.0.title" in a
// repeater row. A translatable source renders one chrome for all its locale
// tabs, named by the field's root, so "title.en" is matched as "title".
const CHROME_ATTR = "data-field-name";

function chromeOf(node: EventTarget | null): Element | null {
	return node instanceof Element ? node.closest(`[${CHROME_ATTR}]`) : null;
}

// The source's chrome name, next to the slug's own: a slug in a repeater row
// reads the source in that same row.
function sourceChromeName(anchor: HTMLElement, fromField: string): string {
	const root = fromField.split(".")[0] ?? "";
	const own = chromeOf(anchor)?.getAttribute(CHROME_ATTR) ?? "";
	const dot = own.lastIndexOf(".");
	return dot === -1 ? root : `${own.slice(0, dot)}.${root}`;
}

// With no relatedTarget the next focus is unknown: the window lost focus
// (switching apps), or the click landed on something unfocusable (Safari
// does not focus buttons). Decide once the focus change has settled.
function settledOutside(chrome: Element, onLeave: () => void): void {
	setTimeout(() => {
		const doc = chrome.ownerDocument;
		if (doc.hasFocus() && !chrome.contains(doc.activeElement)) {
			onLeave();
		}
	}, 0);
}

/**
 * Calls `onBlur` when focus leaves the source field's chrome for somewhere
 * else on the page — not when it moves inside it (a locale tab, a clear
 * button) or when the whole window loses focus. Listens on the nearest form,
 * so a same-named field in another form on the page does not count.
 */
export function useSourceBlur(
	anchor: RefObject<HTMLElement | null>,
	fromField: string,
	onBlur: () => void,
): void {
	const onBlurRef = useRef(onBlur);
	onBlurRef.current = onBlur;

	useEffect(() => {
		const el = anchor.current;
		const scope = el?.closest("form") ?? el?.ownerDocument;
		if (!el || !scope || fromField === "") {
			return;
		}
		const expected = sourceChromeName(el, fromField);
		const handle = (event: Event): void => {
			const { target, relatedTarget } = event as FocusEvent;
			const chrome = chromeOf(target);
			if (!chrome || chrome.getAttribute(CHROME_ATTR) !== expected) {
				return;
			}
			if (relatedTarget === null) {
				settledOutside(chrome, () => onBlurRef.current());
				return;
			}
			if (!chrome.contains(relatedTarget as Node)) {
				onBlurRef.current();
			}
		};
		scope.addEventListener("focusout", handle);
		return () => scope.removeEventListener("focusout", handle);
	}, [anchor, fromField]);
}
