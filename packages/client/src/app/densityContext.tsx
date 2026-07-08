import { createContext, useContext } from "react";
import type { Density } from "./appearance";

/**
 * Shell density from tbtop.appearance.density, fed in by AdminLayoutShell.
 * Consumers (Button, Input, Select, sidebar) read this to tighten their
 * defaults in "compact" mode; an explicit prop on the consumer always wins.
 */
export const DensityContext = createContext<Density>("default");

export function useDensity(): Density {
	return useContext(DensityContext);
}
