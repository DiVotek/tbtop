import { expect, test } from "bun:test";
import { type AdminClient, createAdminClient } from "./client";
import { uploadFile } from "./upload";

// Uploads go through XMLHttpRequest (not fetch), so inject a mock XHR that the
// test drives: it records open()/send() and emits a load event with a canned
// status + responseText. Mirrors the production transport semantics.
type Listener = (e: unknown) => void;

class MockXhr {
	status = 0;
	responseText = "";
	withCredentials = false;
	method = "";
	url = "";
	upload = { addEventListener() {} };
	private listeners: Record<string, Listener[]> = {};

	constructor(
		private readonly onLoad: { status: number; body: string },
		private readonly throwOnSend = false,
	) {}

	open(method: string, url: string) {
		this.method = method;
		this.url = url;
	}
	setRequestHeader() {}
	addEventListener(type: string, fn: Listener) {
		(this.listeners[type] ??= []).push(fn);
	}
	abort() {}
	send() {
		queueMicrotask(() => {
			if (this.throwOnSend) {
				this.emit("error");
				return;
			}
			this.status = this.onLoad.status;
			this.responseText = this.onLoad.body;
			this.emit("load");
		});
	}
	private emit(type: string) {
		for (const fn of this.listeners[type] ?? []) {
			fn({});
		}
	}
}

function makeFile(name = "pic.png", type = "image/png", body = "x"): File {
	return new File([body], name, { type });
}

function clientWithXhr(xhr: MockXhr): AdminClient {
	return createAdminClient({
		baseUrl: "http://api",
		xhr: () => xhr as unknown as XMLHttpRequest,
	});
}

test("upload posts multipart to the entity upload route and returns the row", async () => {
	const row = {
		id: "u1",
		filename: "pic.png",
		mimeType: "image/png",
		filesize: 1,
		url: "/uploads/pic.png",
		width: 100,
		height: 50,
		sizes: [],
	};
	const xhr = new MockXhr({ status: 201, body: JSON.stringify({ data: row }) });
	const client = clientWithXhr(xhr);
	const result = await uploadFile({ client, entityName: "media", file: makeFile() });
	if (!result.data) {
		throw new Error("expected ok");
	}
	expect(result.data.url).toBe("/uploads/pic.png");
	expect(xhr.url).toBe("http://api/admin/uploads/media");
	expect(xhr.method).toBe("POST");
});

test("upload returns the typed error envelope on 413 too-large", async () => {
	const xhr = new MockXhr({
		status: 413,
		body: JSON.stringify({ error: { code: "bad_request", message: "File too large" } }),
	});
	const result = await uploadFile({
		client: clientWithXhr(xhr),
		entityName: "media",
		file: makeFile(),
	});
	if (!result.error) {
		throw new Error("expected error");
	}
	expect(result.error.status).toBe(413);
	expect(result.error.message).toBe("File too large");
});

test("upload returns a network error envelope when the transport fails", async () => {
	const xhr = new MockXhr({ status: 0, body: "" }, true);
	const result = await uploadFile({
		client: clientWithXhr(xhr),
		entityName: "media",
		file: makeFile(),
	});
	if (!result.error) {
		throw new Error("expected error");
	}
	expect(result.error.code).toBe("network");
});
