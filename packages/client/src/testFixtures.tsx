import type { ReactNode } from "react";
import { type AdminClient, ClientProvider, createAdminClient } from "./data/client";
import type { XhrFactory } from "./data/uploadXhr";

export type FetchHandler = (req: Request) => Response | Promise<Response>;

export function makeTestFetch(handler: FetchHandler): typeof fetch {
	const impl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const url = inputToUrl(input);
		const req = new Request(url, init);
		return Promise.resolve(handler(req));
	};
	return impl as unknown as typeof fetch;
}

/**
 * Uploads run over XMLHttpRequest, not fetch. This factory bridges a mock XHR
 * to the same FetchHandler so transport-mock tests keep a single handler for
 * both get/post (fetch) and upload (XHR).
 */
export function makeTestXhr(handler: FetchHandler): XhrFactory {
	return () => new BridgeXhr(handler) as unknown as XMLHttpRequest;
}

export function makeTestClient(handler: FetchHandler): AdminClient {
	return createAdminClient({
		baseUrl: "http://test",
		fetch: makeTestFetch(handler),
		xhr: makeTestXhr(handler),
	});
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

type Listener = (e: unknown) => void;

class BridgeXhr {
	status = 0;
	responseText = "";
	withCredentials = false;
	private method = "POST";
	private url = "";
	private listeners: Record<string, Listener[]> = {};
	upload = { addEventListener() {} };

	constructor(private readonly handler: FetchHandler) {}

	open(method: string, url: string) {
		this.method = method;
		this.url = url;
	}
	setRequestHeader() {}
	addEventListener(type: string, fn: Listener) {
		(this.listeners[type] ??= []).push(fn);
	}
	abort() {
		this.emit("abort");
	}
	send(body: unknown) {
		void this.run(body);
	}

	private async run(body: unknown) {
		try {
			const req = new Request(this.url, { method: this.method, body: body as BodyInit });
			const res = await this.handler(req);
			this.status = res.status;
			this.responseText = res.status === 204 ? "" : await res.text();
			this.emit("load");
		} catch {
			this.emit("error");
		}
	}

	private emit(type: string) {
		for (const fn of this.listeners[type] ?? []) {
			fn({});
		}
	}
}
