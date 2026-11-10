import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { Kysely } from "kysely";
import { BunSqliteDialect } from "kysely-bun-sqlite";
import { Column, createAdmin, defineAbility, definePage, ExportAction, ExportFormat } from "../src";
import { kyselyDriver } from "../src/adapters/kysely";

interface DB {
	posts: {
		id: number;
		title: string;
		published: number;
		status: string;
		note: string;
		sort_order: number;
	};
}

function seededDb(): Kysely<DB> {
	const sqlite = new Database(":memory:");
	sqlite.run(
		"create table posts (id integer primary key, title text, published int, status text, note text, sort_order int)",
	);
	const insert = sqlite.prepare(
		"insert into posts (title, published, status, note, sort_order) values (?, ?, ?, ?, ?)",
	);
	insert.run("Bravo", 1, "live", "n1", 2);
	insert.run("Alpha", 0, "draft", "n2", 1);
	insert.run('=HYPERLINK("x")', 1, "other", "", 3);
	return new Kysely<DB>({ dialect: new BunSqliteDialect({ database: sqlite }) });
}

const db = seededDb();
defineAbility("never", () => false);

const admin = createAdmin({
	allowGuests: true,
	prefix: "/admin",
	driver: kyselyDriver(db) as never,
	pages: [
		definePage({
			path: "export-posts",
			title: "Export",
			view: (s) =>
				s.stack([
					s
						.table("posts")
						.columns([
							Column.make("title").label("Title").sortable().searchable(),
							Column.make("published").label("Published").boolean(),
							Column.make("status")
								.label("Status")
								.badge({ draft: { label: "Draft" }, live: { label: "Live" } }),
							Column.make("sort_order")
								.label("Order")
								.export({ as: (value) => `pos-${String(value)}` }),
							Column.make("note")
								.label("Note")
								.export({ label: "Notes", enabled: false }),
						])
						.filters([s.boolean("published")])
						.headerActions([
							ExportAction.make(s),
							ExportAction.make(s, { maxRows: 2, name: "exportSmall" }),
							ExportAction.make(s, { name: "exportGated" }).authorize("never"),
						])
						.bulkActions([
							ExportAction.make(s, {
								formats: [ExportFormat.Csv],
								filename: "picked",
								name: "exportPicked",
							}),
						])
						.query(() => db.selectFrom("posts")),
					s
						.table("published")
						.columns([Column.make("title").label("Title")])
						.headerActions([ExportAction.make(s, { name: "exportPublished" })])
						.query(() => db.selectFrom("posts").where("published", "=", 1)),
				]),
		}),
	],
});

async function get(path: string): Promise<Response> {
	const res = await admin.handle(new Request(`http://x/admin/export-posts/tables/${path}`));
	if (res === null) {
		throw new TypeError("not an admin endpoint");
	}
	return res;
}

async function csv(path: string): Promise<string[][]> {
	const res = await get(path);
	expect(res.status).toBe(200);
	// ignoreBOM keeps the BOM in the text, so the assertion below can see it.
	const body = new TextDecoder("utf-8", { ignoreBOM: true }).decode(await res.arrayBuffer());
	expect(body.startsWith("\u{FEFF}")).toBe(true);
	return body
		.slice(1)
		.trimEnd()
		.split("\r\n")
		.map((line) => parseCsvLine(line));
}

function parseCsvLine(line: string): string[] {
	const out: string[] = [];
	const re = /("((?:[^"]|"")*)"|[^,]*)(,|$)/g;
	for (const m of line.matchAll(re)) {
		out.push(m[2] !== undefined ? m[2].replaceAll('""', '"') : (m[1] ?? ""));
		if (m[3] === "") {
			break;
		}
	}
	return out;
}

describe("table export", () => {
	test("writes the enabled columns as on screen, export() label and as applied", async () => {
		const res = await get("posts/export/export?format=csv&sort=title&dir=asc");
		expect(res.headers.get("content-type")).toContain("text/csv");
		expect(res.headers.get("content-disposition")).toContain('attachment; filename="posts-');
		expect(res.headers.get("cache-control")).toBe("no-store");
		expect(await csv("posts/export/export?format=csv&sort=title&dir=asc")).toEqual([
			["Title", "Published", "Status", "Order"],
			['\'=HYPERLINK("x")', "Yes", "other", "pos-3"],
			["Alpha", "No", "Draft", "pos-1"],
			["Bravo", "Yes", "Live", "pos-2"],
		]);
	});

	test("columns[] picks the columns, a disabled one included, in declared order", async () => {
		expect(
			await csv(
				"posts/export/export?format=csv&sort=title&dir=asc&columns[]=note&columns[]=title&columns[]=nope",
			),
		).toEqual([
			["Title", "Notes"],
			['\'=HYPERLINK("x")', ""],
			["Alpha", "n2"],
			["Bravo", "n1"],
		]);
		expect((await get("posts/export/export?format=csv&columns[]=nope")).status).toBe(422);
	});

	test("filters and search narrow the file like the table", async () => {
		expect(
			await csv("posts/export/export?format=csv&filters[published]=0&columns[]=title"),
		).toEqual([["Title"], ["Alpha"]]);
		expect(await csv("posts/export/export?format=csv&search=brav&columns[]=title")).toEqual([
			["Title"],
			["Bravo"],
		]);
	});

	test("ids[] exports the selection, and only inside the table scope", async () => {
		const picked = await get("posts/export/exportPicked?ids[]=2&columns[]=title");
		expect(picked.headers.get("content-disposition")).toContain('filename="picked.csv"');
		expect(await csv("posts/export/exportPicked?ids[]=2&columns[]=title")).toEqual([
			["Title"],
			["Alpha"],
		]);
		expect(await csv("published/export/exportPublished?format=csv&ids[]=1&ids[]=2")).toEqual([
			["Title"],
			["Bravo"],
		]);
		expect((await get("posts/export/export?format=csv&ids[0][]=1")).status).toBe(422);
	});

	test("over maxRows is a readable 422 before streaming", async () => {
		const res = await get("posts/export/exportSmall?format=csv");
		expect(res.status).toBe(422);
		expect(((await res.json()) as { message: string }).message).toContain("3 rows");
	});

	test("a format the action does not offer is a 422", async () => {
		expect((await get("posts/export/exportPicked?format=xlsx")).status).toBe(422);
		expect((await get("posts/export/export?format=pdf")).status).toBe(422);
	});

	test.each([
		["authorize() denies", "posts/export/exportGated?format=csv"],
		["action of another table", "published/export/export?format=csv"],
		["unknown action", "posts/export/nope?format=csv"],
		["unknown table", "nope/export/export?format=csv"],
	])("%s is a 404", async (_label, path) => {
		expect((await get(path)).status).toBe(404);
	});

	test("XLSX is a valid zip holding the same cells as the CSV", async () => {
		const res = await get("posts/export/export?format=xlsx&sort=title&dir=asc");
		expect(res.headers.get("content-type")).toBe(
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		);
		const files = await unzip(new Uint8Array(await res.arrayBuffer()));
		expect(files.get("[Content_Types].xml")).toContain("worksheet+xml");
		const sheet = files.get("xl/worksheets/sheet1.xml") ?? "";
		const rows = [...sheet.matchAll(/<row>(.*?)<\/row>/g)].map((r) =>
			[
				...(r[1] ?? "").matchAll(
					/<c[^>]*>(?:<v>(.*?)<\/v>|<is><t[^>]*>(.*?)<\/t><\/is>)<\/c>/g,
				),
			].map((c) => unescapeXml(c[1] ?? c[2] ?? "")),
		);
		expect(rows).toEqual([
			["Title", "Published", "Status", "Order"],
			['=HYPERLINK("x")', "Yes", "other", "pos-3"],
			["Alpha", "No", "Draft", "pos-1"],
			["Bravo", "Yes", "Live", "pos-2"],
		]);
	});
});

function unescapeXml(s: string): string {
	return s
		.replaceAll("&quot;", '"')
		.replaceAll("&apos;", "'")
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&amp;", "&");
}

/** Reads a zip through its central directory, inflating each entry. */
async function unzip(bytes: Uint8Array): Promise<Map<string, string>> {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const eocd = bytes.length - 22;
	expect(view.getUint32(eocd, true)).toBe(0x06054b50);
	const count = view.getUint16(eocd + 10, true);
	let at = view.getUint32(eocd + 16, true);
	const out = new Map<string, string>();
	for (let i = 0; i < count; i++) {
		expect(view.getUint32(at, true)).toBe(0x02014b50);
		const crc = view.getUint32(at + 16, true);
		const csize = view.getUint32(at + 20, true);
		const nameLength = view.getUint16(at + 28, true);
		const local = view.getUint32(at + 42, true);
		const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength));
		const dataStart = local + 30 + view.getUint16(local + 26, true);
		const inflated = await new Response(
			new Blob([bytes.slice(dataStart, dataStart + csize)])
				.stream()
				.pipeThrough(new DecompressionStream("deflate-raw")),
		).arrayBuffer();
		expect(Bun.hash.crc32(new Uint8Array(inflated))).toBe(crc);
		out.set(name, new TextDecoder().decode(inflated));
		at += 46 + nameLength;
	}
	return out;
}
