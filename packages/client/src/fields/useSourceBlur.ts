import { type RefObject, useEffect, useRef } from "react";

// The chrome wrapper every form field renders in (fieldChrome.tsx). A
// translatable source renders one chrome for all its locale tabs, named by
// the field's root, so "title.en" is matched as "title".
const CHROME_ATTR = "data-field-name";

function chromeOf(node: EventTarget | null): Element | null {
	return node instanceof Element ? node.closest(`[${CHROME_ATTR}]`) : null;
}

/**
 * Calls `onBlur` when focus leaves the source field's chrome — not when it
 * moves inside it (a locale tab, a clear button). Listens on the nearest
 * form, so a same-named field in another form on the page does not count.
 */
export function useSourceBlur(
	anchor: RefObject<HTMLElement | null>,
	fromField: string,
	onBlur: () => void,
): void {
	const onBlurRef = useRef(onBlur);
	onBlurRef.current = onBlur;
	const root = fromField.split(".")[0] ?? "";

	useEffect(() => {
		const scope = anchor.current?.closest("form") ?? anchor.current?.ownerDocument;
		if (!scope || root === "") {
			return;
		}
		const handle = (event: Event): void => {
			const { target, relatedTarget } = event as FocusEvent;
			const chrome = chromeOf(target);
			if (chrome?.getAttribute(CHROME_ATTR) !== root || chromeOf(relatedTarget) === chrome) {
				return;
			}
			onBlurRef.current();
		};
		scope.addEventListener("focusout", handle);
		return () => scope.removeEventListener("focusout", handle);
	}, [anchor, root]);
}
