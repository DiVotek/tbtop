import { createContext, useContext } from "react";

/**
 * True inside a `variant: 'card'` section — the card draws the border, so
 * bordered children (embedded tables) must suppress their own frame.
 */
export const SectionFramelessContext = createContext(false);

export function useSectionFrameless(): boolean {
	return useContext(SectionFramelessContext);
}
