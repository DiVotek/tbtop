import { expect, test } from "bun:test";
import { type AdminClient, createAdminClient } from "./client";
import { uploadFile } from "./upload";

function makeFile(name = "pic.png", type = "image/png", body = "x"): File {
	return new File([body], name, { type });
}

function fakeClient(
	impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): AdminClient {
	return createAdminClient({ baseUrl: "http://api", fetch: impl as unknown as typeof fetch });
}

test("upload posts multipart to the entity upload route and returns the row", async () => {
	let captured: Request | null = null;
	const client = fakeClient((input, init) => {
		captured = new Request(input, init);
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
		return Promise.resolve(Response.json({ data: row }, { status: 201 }));
	});
	const result = await uploadFile({
		client,
		entityName: "media",
		file: makeFile(),
	});
	if (!result.data) {
		throw new Error("expected ok");
	}
	expect(result.data.url).toBe("/uploads/pic.png");
	const req = captured as Request | null;
	expect(req?.url).toBe("http://api/admin/uploads/media");
	expect(req?.method).toBe("POST");
});

test("upload returns the typed error envelope on 413 too-large", async () => {
	const client = fakeClient(() =>
		Promise.resolve(
			Response.json(
				{ error: { code: "bad_request", message: "File too large" } },
				{ status: 413 },
			),
		),
	);
	const result = await uploadFile({
		client,
		entityName: "media",
		file: makeFile(),
	});
	if (!result.error) {
		throw new Error("expected error");
	}
	expect(result.error.status).toBe(413);
	expect(result.error.message).toBe("File too large");
});

test("upload returns a network error envelope when fetch throws", async () => {
	const client = fakeClient(() => Promise.reject(new Error("offline")));
	const result = await uploadFile({
		client,
		entityName: "media",
		file: makeFile(),
	});
	if (!result.error) {
		throw new Error("expected error");
	}
	expect(result.error.code).toBe("network");
});
