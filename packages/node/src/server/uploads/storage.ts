/** Bytes the Web APIs (Blob, crypto) accept without a copy. */
export type Bytes = Uint8Array<ArrayBuffer>;

/**
 * A storage disk (Laravel's `Storage::disk()`), reduced to what uploads need.
 * Local disk, S3, R2 or anything else is the host's choice.
 */
export interface Disk {
	put(path: string, body: Bytes, options: { contentType: string }): Promise<void>;
	/** The stored bytes, or null when missing: streams private files. */
	get(path: string): Promise<Blob | null>;
	delete(path: string): Promise<void>;
	/** The public URL of a stored file; same-origin URLs should be path-relative. */
	url(path: string): string;
}

/** A disk in memory: tests and demos. */
export function memoryDisk(baseUrl = "/storage"): Disk & { files: Map<string, Blob> } {
	const files = new Map<string, Blob>();
	return {
		files,
		put: async (path, body, { contentType }) => {
			files.set(path, new Blob([body], { type: contentType }));
		},
		get: async (path) => files.get(path) ?? null,
		delete: async (path) => {
			files.delete(path);
		},
		url: (path) => `${baseUrl}/${path}`,
	};
}

/** The part of a Workers R2 binding a disk needs. */
export interface R2Like {
	put(
		key: string,
		value: Bytes,
		options?: { httpMetadata?: { contentType?: string } },
	): Promise<unknown>;
	get(key: string): Promise<{ blob(): Promise<Blob> } | null>;
	delete(key: string): Promise<void>;
}

/** Cloudflare R2 through its Worker binding; `publicUrl` is the bucket's public domain. */
export function r2Disk(bucket: R2Like, publicUrl: string): Disk {
	const base = publicUrl.replace(/\/+$/, "");
	return {
		put: async (path, body, { contentType }) => {
			await bucket.put(path, body, { httpMetadata: { contentType } });
		},
		get: async (path) => (await (await bucket.get(path))?.blob()) ?? null,
		delete: (path) => bucket.delete(path),
		url: (path) => `${base}/${path}`,
	};
}
