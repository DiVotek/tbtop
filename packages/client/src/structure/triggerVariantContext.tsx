import { createContext, type ReactNode, useContext } from "react";

/**
 * Ambient override for how an ActionBlock's trigger renders, set by a
 * layout wrapper (e.g. RowBlock's grid variant) that already supplies its
 * own clickable chrome — the trigger itself should then render as plain
 * text, not a bordered/shadowed Button.
 */
export type TriggerVariant = "plain";

const TriggerVariantCtx = createContext<TriggerVariant | null>(null);

export function TriggerVariantProvider({
	value,
	children,
}: {
	value: TriggerVariant;
	children: ReactNode;
}) {
	return <TriggerVariantCtx.Provider value={value}>{children}</TriggerVariantCtx.Provider>;
}

export function useNearestTriggerVariant(): TriggerVariant | null {
	return useContext(TriggerVariantCtx);
}
