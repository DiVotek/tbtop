/**
 * Bridges a table's active-tab description up to the page title block.
 * AdminPage provides the setter; a table deep in the page tree (any nesting)
 * calls it when its active tab carries a description. Last-write-wins across
 * multiple tables on one page — same as the page's own static subtitle, only
 * one subtitle line is shown at a time.
 */
import { createContext, type ReactNode, useContext, useState } from "react";

type SetPageSubtitle = (subtitle: string | undefined) => void;

const PageSubtitleContext = createContext<string | undefined>(undefined);
const SetPageSubtitleContext = createContext<SetPageSubtitle>(() => {});

export function PageSubtitleProvider({ children }: { children: ReactNode }) {
	const [subtitle, setSubtitle] = useState<string | undefined>();
	return (
		<SetPageSubtitleContext.Provider value={setSubtitle}>
			<PageSubtitleContext.Provider value={subtitle}>{children}</PageSubtitleContext.Provider>
		</SetPageSubtitleContext.Provider>
	);
}

/** Read the active tab-derived subtitle; undefined when no table set one. */
export function usePageSubtitle(): string | undefined {
	return useContext(PageSubtitleContext);
}

/** Push (or clear, via undefined) a subtitle from deep in the page tree. */
export function useSetPageSubtitle(): SetPageSubtitle {
	return useContext(SetPageSubtitleContext);
}
