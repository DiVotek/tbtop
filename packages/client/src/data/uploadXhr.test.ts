import { expect, test } from "bun:test";
import { isTabletopError } from "./envelope";
import { uploadViaXhr } from "./uploadXhr";

// ─── Mock XHR ──────────────────────────────────────────────────────────────────
// Hand-rolled XMLHttpRequest stand-in: happy-dom's XHR makes real requests, so we
// inject this through the factory and drive lifecycle events manually.

type Listener = (e: unknown) => void;

class MockXhr {
	status = 0;
	responseText = "";
	withCredentials = false;
	method = "";
	url = "";
	sentBody: unknown = null;
	headers: Record<string, string> = {};
	aborted = false;
	private listeners: Record<string, Listener[]> = {};
	upload = {
		listeners: {} as Record<string, Listener[]>,
		addEventListener(type: string, fn: Listener) {
			(this.listeners[type] ??= []).push(fn);
		},
		emit(type: string, e: unknown) {
			for (const fn of this.listeners[type] ?? []) {
				fn(e);
			}
		},
	};

	open(method: string, url: string) {
		this.method = method;
		this.url = url;
	}

	setRequestHeader(key: string, value: string) {
		this.headers[key] = value;
	}

	addEventListener(type: string, fn: Listener) {
		(this.listeners[type] ??= []).push(fn);
	}

	emit(type: string, e: unknown = {}) {
		for (const fn of this.listeners[type] ?? []) {
			fn(e);
		}
	}

	send(body: unknown) {
		this.sentBody = body;
	}

	abort() {
		this.aborted = true;
		this.emit("abort");
	}
}

function makeFd(): FormData {
	const fd = new FormData();
	fd.append("file", new File(["x"], "a.png", { type: "image/png" }));
	return fd;
}

function headers(): Record<string, string> {
	return { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" };
}

// ─── Tests ──────────────────────────────────────────────────────────────────────

test("reports upload progress through onProgress", async () => {
	const xhr = new MockXhr();
	const seen: Array<[number, number]> = [];
	const p = uploadViaXhr({
		xhrFactory: () => xhr as unknown as XMLHttpRequest,
		url: "http://api/media/upload",
		formData: makeFd(),
		headers: headers(),
		onProgress: (loaded, total) => seen.push([loaded, total]),
	});
	xhr.upload.emit("progress", { lengthComputable: true, loaded: 50, total: 100 });
	xhr.upload.emit("progress", { lengthComputable: false, loaded: 0, total: 0 });
	xhr.status = 201;
	xhr.responseText = JSON.stringify({ id: "m1" });
	xhr.emit("load");
	await p;
	expect(seen).toEqual([[50, 100]]);
});

test("sets withCredentials and applies headers", () => {
	const xhr = new MockXhr();
	void uploadViaXhr({
		xhrFactory: () => xhr as unknown as XMLHttpRequest,
		url: "http://api/media/upload",
		formData: makeFd(),
		headers: { Accept: "application/json", "X-CSRF-TOKEN": "tok" },
	});
	expect(xhr.withCredentials).toBe(true);
	expect(xhr.method).toBe("POST");
	expect(xhr.headers["X-CSRF-TOKEN"]).toBe("tok");
});

test("resolves the parsed body on 201", async () => {
	const xhr = new MockXhr();
	const p = uploadViaXhr({
		xhrFactory: () => xhr as unknown as XMLHttpRequest,
		url: "http://api/media/upload",
		formData: makeFd(),
		headers: headers(),
	});
	xhr.status = 201;
	xhr.responseText = JSON.stringify({ id: "m1", name: "a.png" });
	xhr.emit("load");
	const body = await p;
	expect(body).toEqual({ id: "m1", name: "a.png" });
});

test("returns null on 204", async () => {
	const xhr = new MockXhr();
	const p = uploadViaXhr({
		xhrFactory: () => xhr as unknown as XMLHttpRequest,
		url: "http://api/media/upload",
		formData: makeFd(),
		headers: headers(),
	});
	xhr.status = 204;
	xhr.emit("load");
	expect(await p).toBeNull();
});

test("rejects via errorFromBody on a 4xx", async () => {
	const xhr = new MockXhr();
	const p = uploadViaXhr({
		xhrFactory: () => xhr as unknown as XMLHttpRequest,
		url: "http://api/media/upload",
		formData: makeFd(),
		headers: headers(),
	});
	xhr.status = 422;
	xhr.responseText = JSON.stringify({
		error: { code: "validation", message: "File too large" },
	});
	xhr.emit("load");
	await expect(p).rejects.toMatchObject({
		code: "validation",
		message: "File too large",
		status: 422,
	});
});

test("rejects with a network error on transport error", async () => {
	const xhr = new MockXhr();
	const p = uploadViaXhr({
		xhrFactory: () => xhr as unknown as XMLHttpRequest,
		url: "http://api/media/upload",
		formData: makeFd(),
		headers: headers(),
	});
	xhr.emit("error");
	const err = await p.catch((e: unknown) => e);
	expect(isTabletopError(err)).toBe(true);
	expect((err as { code: string }).code).toBe("network");
});

test("aborts the request when the signal fires", async () => {
	const xhr = new MockXhr();
	const controller = new AbortController();
	const p = uploadViaXhr({
		xhrFactory: () => xhr as unknown as XMLHttpRequest,
		url: "http://api/media/upload",
		formData: makeFd(),
		headers: headers(),
		signal: controller.signal,
	});
	controller.abort();
	expect(xhr.aborted).toBe(true);
	await expect(p).rejects.toMatchObject({ status: 0 });
});
