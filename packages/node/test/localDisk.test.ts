import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { localDisk } from "../src/adapters/localDisk";

const opts = { contentType: "text/plain" };
const disk = async () => localDisk(await mkdtemp(join(tmpdir(), "disk-")));

describe("localDisk", () => {
	test("stores, reads and deletes a file under the root", async () => {
		const d = await disk();
		await d.put("a/b.txt", new TextEncoder().encode("hi"), opts);
		expect(await (await d.get("a/b.txt"))?.text()).toBe("hi");
		await d.delete("a/b.txt");
		expect(await d.get("a/b.txt")).toBeNull();
	});

	test("refuses a path outside the root as a rejected promise", async () => {
		const d = await disk();
		await expect(d.put("../x.txt", new Uint8Array(), opts)).rejects.toThrow("escapes");
		await expect(d.get("../x.txt")).rejects.toThrow("escapes");
		await expect(d.delete("../x.txt")).rejects.toThrow("escapes");
	});
});
