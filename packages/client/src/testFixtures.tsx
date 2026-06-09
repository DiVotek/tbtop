import type { ReactNode } from "react";
import { type AdminClient, ClientProvider, createAdminClient } from "./data/client";

export type FetchHandler = (req: Request) => Response | Promise<Response>;

export function makeTestFetch(handler: FetchHandler): typeof fetch {
	const impl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const url = inputToUrl(input);
		const req = new Request(url, init);
		return Promise.resolve(handler(req));
	};
	return impl as unknown as typeof fetch;
}

export function makeTestClient(handler: FetchHandler): AdminClient {
	return createAdminClient({ baseUrl: "http://test", fetch: makeTestFetch(handler) });
}

export function clientWrapper(handler: FetchHandler) {
	const client = makeTestClient(handler);
	return function Wrap({ children }: { children: ReactNode }) {
		return <ClientProvider client={client}>{children}</ClientProvider>;
	};
}

function inputToUrl(input: RequestInfo | URL): string {
	if (typeof input === "string") {
		return input;
	}
	if (input instanceof URL) {
		return input.toString();
	}
	return input.url;
}
