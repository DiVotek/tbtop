import { actAs, panelVersion } from "../server/testing";

/** The admin handle the tester drives: what createAdmin() returns. */
export interface TestableAdmin {
	handle(request: Request): Promise<Response | null>;
	prefix: string;
}

/** A response read once: status, headers and the parsed body. */
export interface TestResponse {
	status: number;
	headers: Headers;
	/** The JSON body, or null when the body is not JSON. */
	json: unknown;
	text: string;
}

const ORIGIN = "http://localhost";

/**
 * Requests the way the React client sends them, straight into admin.handle():
 * Inertia headers, JSON bodies, cookies carried between calls, and the user
 * the test acts as.
 */
export class Client {
	private readonly cookies = new Map<string, string>();

	constructor(
		private readonly admin: TestableAdmin,
		private readonly user: unknown,
	) {}

	/** An Inertia visit carrying the panel's asset version. */
	visit(url: string): Promise<TestResponse> {
		return this.send(url, { headers: this.inertia() });
	}

	/** A form submit: an Inertia POST from `from`, so back() returns there. */
	submit(url: string, data: unknown, from: string): Promise<TestResponse> {
		return this.send(url, {
			method: "POST",
			body: JSON.stringify(data),
			headers: { ...this.inertia(), "content-type": "application/json", referer: abs(from) },
		});
	}

	/** An action call: `{ payload }` as JSON. */
	action(url: string, payload: unknown): Promise<TestResponse> {
		return this.send(url, {
			method: "POST",
			body: JSON.stringify({ payload }),
			headers: { "content-type": "application/json", accept: "application/json" },
		});
	}

	/** A JSON GET with PHP-style bracketed query params. */
	fetch(url: string, query: Record<string, unknown> = {}): Promise<TestResponse> {
		const search = phpQuery(query);
		return this.send(search === "" ? url : `${url}?${search}`, {
			headers: { accept: "application/json" },
		});
	}

	private inertia(): Record<string, string> {
		const version = panelVersion(this.admin);
		return {
			"x-inertia": "true",
			...(version === null ? {} : { "x-inertia-version": version }),
		};
	}

	private async send(url: string, init: RequestInit): Promise<TestResponse> {
		const headers = new Headers(init.headers);
		if (this.cookies.size > 0) {
			headers.set("cookie", [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "));
		}
		const request = actAs(new Request(abs(url), { ...init, headers }), this.user);
		const response =
			(await this.admin.handle(request)) ?? new Response("Not found", { status: 404 });
		this.keep(response.headers.getSetCookie());
		const text = await response.text();
		return { status: response.status, headers: response.headers, json: parse(text), text };
	}

	private keep(setCookies: string[]): void {
		for (const line of setCookies) {
			const [pair = ""] = line.split(";");
			const at = pair.indexOf("=");
			const expired = /max-age=0|expires=thu, 01 jan 1970/i.test(line);
			if (at > 0 && expired) {
				this.cookies.delete(pair.slice(0, at).trim());
			} else if (at > 0) {
				this.cookies.set(pair.slice(0, at).trim(), pair.slice(at + 1).trim());
			}
		}
	}
}

const abs = (url: string) => new URL(url, ORIGIN).href;

function parse(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

/** http_build_query: nested objects and lists as `a[b]=c`, nulls dropped. */
export function phpQuery(value: Record<string, unknown>, prefix = ""): string {
	return Object.entries(value)
		.flatMap(([k, v]) => {
			const name = prefix === "" ? k : `${prefix}[${k}]`;
			if (v === null || v === undefined) {
				return [];
			}
			if (typeof v === "object") {
				const nested = phpQuery(v as Record<string, unknown>, name);
				return nested === "" ? [] : [nested];
			}
			return [`${encodeURIComponent(name)}=${encodeURIComponent(String(v))}`];
		})
		.join("&");
}
