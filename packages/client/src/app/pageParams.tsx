import { createContext, type ReactNode, useContext } from "react";

export type PageParams = Record<string, string>;

// Route params arrive as Inertia page props on the Laravel side; the page
// layout (wired later) provides them here so ported code can keep calling
// useParams() with the react-router signature.
export const PageParamsContext = createContext<PageParams>({});

interface PageParamsProviderProps {
	params: PageParams;
	children: ReactNode;
}

export function PageParamsProvider({ params, children }: PageParamsProviderProps) {
	return <PageParamsContext.Provider value={params}>{children}</PageParamsContext.Provider>;
}

export function useParams(): PageParams {
	return useContext(PageParamsContext);
}
