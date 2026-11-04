/**
 * Installs the packed tarball into a fresh project with npm and drives it
 * under Node: what works only from the sources (a missing file, an export
 * that resolves to nothing, a Bun-only API, types that need @types/bun)
 * fails here. Run after `bun run build`.
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const RUNTIME = `
import { createAdmin, definePage, memorySessions, Column } from "@tbtop/admin";
import { memoryDriver, memoryQuery } from "@tbtop/admin/memory";
import { kyselyDriver } from "@tbtop/admin/kysely";
import { localDisk } from "@tbtop/admin/local-disk";
import { sharpImages } from "@tbtop/admin/sharp";

const rows = [{ id: 1, title: "Packed" }];
const posts = definePage({
	path: "posts",
	title: "Posts",
	nav: { label: "Posts" },
	view: (s) => s.table("posts").columns([Column.make("title")]).query(() => memoryQuery(() => rows)),
});
const admin = createAdmin({
	prefix: "/admin",
	allowGuests: true,
	pages: [posts],
	driver: memoryDriver(),
	session: memorySessions(),
	disks: { public: localDisk("storage") },
	mcp: { authenticate: () => ({ name: "agent" }) },
});
const expect = async (url, init, needle) => {
	const res = await admin.handle(new Request("http://x" + url, init));
	const body = await res.text();
	if (res.status !== 200 || !body.includes(needle)) {
		throw new Error(url + " answered " + res.status + ": " + body.slice(0, 200));
	}
};
await expect("/admin/posts", {}, 'data-page="app"');
await expect("/admin/posts/tables/posts", {}, "Packed");
await expect("/admin/mcp", {
	method: "POST",
	body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
}, '"execute"');
for (const fn of [kyselyDriver, sharpImages]) {
	if (typeof fn !== "function") throw new Error("an adapter export is missing");
}
console.log("node: the packed package serves a page, a table and MCP");
`;

const TYPES = `
import { createAdmin, definePage, type PageDef } from "@tbtop/admin";
import { kyselyDriver } from "@tbtop/admin/kysely";

const page: PageDef = definePage({ path: "a", title: "A", view: (s) => s.text("x") });
const admin = createAdmin({ prefix: "/admin", pages: [page] });
const handled: Promise<Response | null> = admin.handle(new Request("http://x/admin/a"));
void handled;
void kyselyDriver;
`;

const TSCONFIG = {
	compilerOptions: {
		strict: true,
		noEmit: true,
		target: "ES2023",
		module: "NodeNext",
		moduleResolution: "NodeNext",
		lib: ["ES2023", "DOM"],
		types: [],
	},
	files: ["types.ts"],
};

async function run(cmd: string[], cwd: string): Promise<void> {
	const proc = Bun.spawn(cmd, { cwd, stdout: "inherit", stderr: "inherit" });
	if ((await proc.exited) !== 0) {
		throw new Error(`${cmd.join(" ")} failed`);
	}
}

const packageDir = new URL("..", import.meta.url).pathname;
const work = await mkdtemp(join(tmpdir(), "tbtop-admin-pack-"));
try {
	await run(["npm", "pack", "--silent", "--pack-destination", work], packageDir);
	const tarball = [...new Bun.Glob("tbtop-admin-*.tgz").scanSync(work)][0];
	const manifest = {
		private: true,
		type: "module",
		dependencies: { "@tbtop/admin": `file:./${tarball}`, kysely: "^0.28.0" },
		devDependencies: { typescript: "^5.9.0" },
	};
	await writeFile(join(work, "package.json"), JSON.stringify(manifest));
	await writeFile(join(work, "runtime.mjs"), RUNTIME);
	await writeFile(join(work, "types.ts"), TYPES);
	await writeFile(join(work, "tsconfig.json"), JSON.stringify(TSCONFIG));
	await run(["npm", "install", "--silent", "--no-audit", "--no-fund"], work);
	await run(["node", "runtime.mjs"], work);
	await run(["npx", "tsc", "-p", "."], work);
	console.log("types: the packed .d.ts compile under NodeNext without @types/bun");
} finally {
	await rm(work, { recursive: true, force: true });
}
