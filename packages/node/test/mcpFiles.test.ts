import { beforeEach, describe, expect, test } from "bun:test";
import { createAdmin, definePage, Effects, Embed, memoryDisk } from "../src";
import { isRemote } from "../src/server/mcp/formFields";

const PNG = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

const disk = memoryDisk();
const MIME_REFUSED = "This file type is not allowed.";
const fetched: string[] = [];
const reported: unknown[] = [];
let ran: Record<string, unknown> | null = null;

beforeEach(() => {
	disk.files.clear();
	fetched.length = 0;
	reported.length = 0;
	ran = null;
});

const filesPage = definePage({
	path: "files",
	title: "Files",
	view: (s) =>
		s
			.form("post", [
				s.text("title"),
				s.upload("cover").accept("image/*").maxSize(1000),
				s.upload("gallery").accept("image/*").multiple(),
				s.media("logo"),
				s
					.repeater("sections")
					.fields([s.text("heading"), s.upload("image").accept("image/*")]),
			])
			.record({
				title: "Hello",
				cover: "uploads/old.png",
				gallery: ["uploads/a.png"],
				logo: 7,
				sections: [{ heading: "Intro", image: "uploads/intro.png" }],
			})
			.onSubmit(({ form }) => {
				ran = form;
				return Effects.make().notify("Saved");
			}),
});

const docsPage = definePage({
	path: "docs",
	title: "Docs",
	view: (s) =>
		s
			.form("doc", [
				s.upload("file").translatable(),
				s
					.upload("scan")
					.accept("image/*")
					.saveUsing(async () => ({ path: "custom/scan.png", url: "/custom/scan.png" })),
				s.upload("pics").multiple(),
				s
					.richtext("body")
					.embeds([Embed.make("figure").fields([s.upload("image"), s.text("caption")])]),
			])
			.onSubmit(({ form }) => {
				ran = form;
				return Effects.make().notify("Saved");
			}),
});

const lockedPage = definePage({
	path: "locked",
	title: "Locked",
	authorize: () => false,
	view: (s) =>
		s.form("doc", [s.upload("file")]).onSubmit(({ form }) => {
			ran = form;
			return Effects.make().notify("Saved");
		}),
});

/** A stand-in for the host's guarded fetch: one PNG, a 404, a too-large body and a non-image. */
async function fetchRemote(url: string): Promise<Response> {
	fetched.push(url);
	if (url.endsWith("/blocked.png")) {
		throw new Error("private address refused");
	}
	if (url.endsWith("/missing.png")) {
		return new Response("nope", { status: 404 });
	}
	if (url.endsWith("/huge.png")) {
		return new Response(new Uint8Array(5000), { headers: { "content-type": "image/png" } });
	}
	if (url.endsWith("/stream.png")) {
		const chunk = new Uint8Array(400);
		let sent = 0;
		const stream = new ReadableStream<Uint8Array>({
			pull(controller) {
				sent += 1;
				return sent > 50 ? controller.close() : controller.enqueue(chunk);
			},
		});
		return new Response(stream, { headers: { "content-type": "image/png" } });
	}
	if (url.endsWith("/empty.png")) {
		return new Response(null, { headers: { "content-type": "image/png" } });
	}
	if (url.endsWith("/page.html")) {
		return new Response("<html></html>", { headers: { "content-type": "text/html" } });
	}
	return new Response(PNG, { headers: { "content-type": "image/png" } });
}

/** The host's hook as configured: a plain function that may throw before returning a promise. */
function hostFetch(url: string): Promise<Response> {
	if (url.endsWith("/sync.png")) {
		throw new Error("refused synchronously");
	}
	return fetchRemote(url);
}

function adminWith(remote: boolean) {
	return createAdmin({
		allowGuests: true,
		prefix: "/admin",
		pages: [filesPage, docsPage, lockedPage],
		disks: { public: disk },
		mcp: {
			authenticate: () => ({ name: "agent" }),
			report: (error: unknown) => reported.push(error),
			...(remote ? { fetchRemote: hostFetch } : {}),
		},
	});
}

async function call(admin: ReturnType<typeof createAdmin>, name: string, args: unknown) {
	const res = await admin.handle(
		new Request("http://x/admin/mcp", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "tools/call",
				params: { name, arguments: args },
			}),
		}),
	);
	const body = (await res?.json()) as {
		result: { content: { text: string }[]; isError?: boolean };
	};
	return {
		data: JSON.parse(body.result.content[0]?.text ?? "null"),
		isError: body.result.isError === true,
	};
}

const withFetch = adminWith(true);
const without = adminWith(false);
const execute = (admin: ReturnType<typeof createAdmin>, form: Record<string, unknown>) =>
	call(admin, "execute", { id: "files:post", form });

describe("MCP upload fields by URL", () => {
	test("without fetchRemote every file field is excluded, and a {url} is refused", async () => {
		const { data } = await call(without, "search", { page: "files" });
		const form = data.executables[0];
		expect(form.fields.map((f: { name: string }) => f.name)).toEqual([
			"title",
			"sections",
			"sections.*.heading",
		]);
		expect(form.excludedFields.map((f: { name: string }) => f.name)).toEqual([
			"cover",
			"gallery",
			"logo",
			"sections.*.image",
		]);
		expect(form.excludedFields[0].reason).toBe(
			"upload fields need the host's mcp.fetchRemote to be filled over MCP",
		);
		const refused = await execute(without, { cover: { url: "https://cdn.example/new.png" } });
		expect(refused.data.message).toBe(
			"Send a file field as {url} or its current value; fields listed in excludedFields only as their current value: cover.",
		);
		expect(fetched).toEqual([]);
	});

	test("with fetchRemote uploads are listed as {url}; media stays excluded", async () => {
		const { data } = await call(withFetch, "search", { page: "files" });
		const form = data.executables[0];
		const cover = form.fields.find((f: { name: string }) => f.name === "cover");
		expect(cover).toMatchObject({ kind: "upload", value: "{url}", accept: ["image/*"] });
		const gallery = form.fields.find((f: { name: string }) => f.name === "gallery");
		expect(gallery).toMatchObject({ value: "{url}", multiple: true });
		expect(form.excludedFields).toEqual([
			{ name: "logo", kind: "media", reason: "media fields cannot be filled over MCP" },
		]);
	});

	test("a {url} is fetched, stored and reaches the handler as a path", async () => {
		const result = await execute(withFetch, {
			title: "Hello",
			cover: { url: "https://cdn.example/new.png" },
			gallery: ["uploads/a.png", { url: "https://cdn.example/b.png" }],
			sections: [
				{ heading: "Intro", image: "uploads/intro.png" },
				{ heading: "More", image: { url: "https://cdn.example/more.png" } },
			],
		});
		expect(result.isError).toBe(false);
		expect(fetched).toEqual([
			"https://cdn.example/new.png",
			"https://cdn.example/b.png",
			"https://cdn.example/more.png",
		]);
		const form = ran as unknown as {
			cover: string;
			gallery: string[];
			sections: { image: string }[];
		};
		expect(form.cover).toMatch(/^uploads\/\w{40}\.png$/);
		expect(form.gallery[0]).toBe("uploads/a.png");
		expect(form.gallery[1]).toMatch(/^uploads\/\w{40}\.png$/);
		expect(form.sections[1]?.image).toMatch(/^uploads\/\w{40}\.png$/);
		expect(disk.files.size).toBe(3);
	});

	test("a stored file may be kept or replaced, never dropped or swapped for a path", async () => {
		const dropped = await execute(withFetch, {
			gallery: [],
		});
		expect(dropped.data.message).toContain("as their current value: gallery.");
		const forged = await execute(withFetch, { cover: "uploads/someone-else.png" });
		expect(forged.data.message).toContain("as their current value: cover.");
		expect(ran).toBeNull();
		expect(fetched).toEqual([]);
	});

	test("fetch and type failures name the field and run nothing", async () => {
		const cases: [string, string][] = [
			[
				"ftp://cdn.example/a.png",
				"cover: The URL is not allowed (blocked for security reasons).",
			],
			[
				"https://cdn.example/missing.png",
				"cover: Could not download the file from the given URL.",
			],
			["https://cdn.example/huge.png", "cover: The file exceeds the maximum allowed size."],
			["https://cdn.example/stream.png", "cover: The file exceeds the maximum allowed size."],
			[
				"https://cdn.example/empty.png",
				"cover: Could not download the file from the given URL.",
			],
			["https://cdn.example/page.html", `cover: ${MIME_REFUSED}`],
		];
		for (const [url, message] of cases) {
			const result = await execute(withFetch, { cover: { url } });
			expect(result).toEqual({ isError: true, data: { message } });
		}
		expect(ran).toBeNull();
		expect(disk.files.size).toBe(0);
	});

	test("more than 20 {url} references in one call are refused before any fetch", async () => {
		const gallery = Array.from({ length: 21 }, () => ({ url: "https://cdn.example/b.png" }));
		const result = await execute(withFetch, { gallery: ["uploads/a.png", ...gallery] });
		expect(result.data.message).toBe(
			"At most 20 files may be sent as {url} in one call; this one has 21.",
		);
		expect(fetched).toEqual([]);
	});

	test("a bare {url} on a multiple upload is refused before any fetch", async () => {
		const result = await execute(withFetch, { gallery: { url: "https://cdn.example/b.png" } });
		expect(result.data.message).toBe("gallery: a multiple field takes a list; send [{url}].");
		expect(fetched).toEqual([]);
	});

	test("a {url} nested where the field takes no file is refused before any fetch", async () => {
		const ref = { url: "https://cdn.example/a.png" };
		for (const image of [[ref], { x: ref }]) {
			const result = await execute(withFetch, {
				sections: [
					{ heading: "Intro", image: "uploads/intro.png" },
					{ heading: "New", image },
				],
			});
			expect(result.data.message).toBe(
				"sections.1.image: send {url} as the value, in a list when the field is multiple, or per locale when it is translatable.",
			);
		}
		expect(fetched).toEqual([]);
	});

	test("a translatable file field takes {url} per locale only", async () => {
		const result = await call(withFetch, "execute", {
			id: "docs:doc",
			form: { file: { url: "https://cdn.example/a.png" } },
		});
		expect(result.data.message).toBe(
			"file: send {url} as the value, in a list when the field is multiple, or per locale when it is translatable.",
		);
		expect(fetched).toEqual([]);
	});

	test("a fetchRemote that throws is reported and answered as a failed download", async () => {
		const result = await execute(withFetch, {
			cover: { url: "https://cdn.example/blocked.png" },
		});
		expect(result.data.message).toBe("cover: Could not download the file from the given URL.");
		expect(String(reported[0])).toContain("private address refused");
	});

	test("a fetchRemote that throws synchronously is reported the same way", async () => {
		const result = await execute(withFetch, { cover: { url: "https://cdn.example/sync.png" } });
		expect(result.data.message).toBe("cover: Could not download the file from the given URL.");
		expect(String(reported[0])).toContain("refused synchronously");
	});

	test("a file value must have the field's shape, refused before any fetch", async () => {
		const placement =
			"send {url} as the value, in a list when the field is multiple, or per locale when it is translatable.";
		const cases: [Record<string, unknown>, string][] = [
			[{ scan: {} }, `scan: ${placement}`],
			[{ scan: [] }, `scan: ${placement}`],
			[{ pics: {} }, `pics: ${placement}`],
		];
		for (const [form, message] of cases) {
			const result = await call(withFetch, "execute", { id: "docs:doc", form });
			expect(result.data.message).toBe(message);
		}
		expect(fetched).toEqual([]);
	});

	test("a caller the page gate refuses triggers no download", async () => {
		const result = await call(withFetch, "execute", {
			id: "locked:doc",
			form: { file: { url: "https://cdn.example/a.png" } },
		});
		expect(result.data.message).toBe("Forbidden: This action is unauthorized.");
		expect(fetched).toEqual([]);
		expect(disk.files.size).toBe(0);
	});

	test("a field's saveUsing() gets only a type the field accepts", async () => {
		const refused = await call(withFetch, "execute", {
			id: "docs:doc",
			form: { scan: { url: "https://cdn.example/page.html" } },
		});
		expect(refused.data.message).toBe(`scan: ${MIME_REFUSED}`);
		const stored = await call(withFetch, "execute", {
			id: "docs:doc",
			form: { scan: { url: "https://cdn.example/scan.png" } },
		});
		expect(stored.isError).toBe(false);
		expect(ran?.scan).toBe("custom/scan.png");
	});

	test("a file field inside a richtext embed stays excluded: only form fields are fetched", async () => {
		const { data } = await call(withFetch, "search", { page: "docs" });
		const body = data.executables[0].fields.find((f: { name: string }) => f.name === "body");
		expect(body.embeds[0].fields.map((f: { name: string }) => f.name)).toEqual(["caption"]);
		expect(body.embeds[0].excludedFields).toEqual([
			{
				name: "image",
				kind: "upload",
				reason: "a file inside a richtext embed cannot be sent as {url} over MCP",
			},
		]);
	});
});

test("a {url} whose name is not a string is an ordinary value, not a reference", () => {
	expect(isRemote({ url: "https://cdn.example/a.png", name: "a.png" })).toBe(true);
	expect(isRemote({ url: "https://cdn.example/a.png", name: 5 })).toBe(false);
	expect(isRemote({ url: "https://cdn.example/a.png", name: { x: 1 } })).toBe(false);
});
