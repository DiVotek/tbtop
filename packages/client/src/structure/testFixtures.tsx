import type { ReactNode } from "react";
import { PageParamsProvider } from "../app/pageParams";
import { clientWrapper, type FetchHandler } from "../testFixtures";

export function wrapForStructure(handler: FetchHandler) {
	const Wrap = clientWrapper(handler);
	return function Provider({ children }: { children: ReactNode }) {
		return (
			<PageParamsProvider params={{}}>
				<Wrap>{children}</Wrap>
			</PageParamsProvider>
		);
	};
}
