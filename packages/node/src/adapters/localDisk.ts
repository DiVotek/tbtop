import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { Disk } from "../server/uploads/storage";

/**
 * A directory on the server's filesystem (Laravel's `local`/`public` disks):
 * Bun and Node only. The host serves `baseUrl` from `root` for public files.
 */
export function localDisk(root: string, baseUrl = "/storage"): Disk {
	const absolute = resolve(root);
	const within = (path: string) => {
		const full = resolve(join(absolute, path));
		if (!full.startsWith(`${absolute}/`)) {
			throw new Error(`Path "${path}" escapes the disk root.`);
		}
		return full;
	};
	return {
		put: async (path, body) => {
			const full = within(path);
			await mkdir(dirname(full), { recursive: true });
			await writeFile(full, body);
		},
		get: async (path) => {
			const bytes = await readFile(within(path)).catch(() => null);
			return bytes === null ? null : new Blob([new Uint8Array(bytes)]);
		},
		delete: (path) => rm(within(path), { force: true }),
		url: (path) => `${baseUrl.replace(/\/+$/, "")}/${path}`,
	};
}
