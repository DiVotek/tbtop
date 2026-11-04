import type { Upload } from "../../dsl";
import { diskFor, type FieldConfig, fieldConfig, type UploadOptions } from "./config";
import { signedViewUrl } from "./signing";
import type { StoredFile } from "./store";

export interface UrlScope {
	options: UploadOptions;
	/** The page URL path; the view route hangs under it. */
	pagePath: string;
}

/** UploadFieldUrl::for(): the disk URL, or a fresh signed view URL for a private field. */
export function uploadUrl(
	scope: UrlScope,
	{ field, config, path }: { field: string; config: FieldConfig; path: string },
) {
	if (config.visibility !== "private") {
		return Promise.resolve(diskFor(scope.options, config).url(path));
	}
	const { secret } = scope.options;
	if (secret === undefined) {
		throw new Error("Private uploads need createAdmin({ secret }) to sign their URLs.");
	}
	return signedViewUrl(secret, `${scope.pagePath}/uploads/${field}/view`, { path });
}

/** UploadFieldUrl::applyToRecord(): stored paths become `{path, url}`, per locale and per file. */
export async function withUploadUrls(
	record: Record<string, unknown>,
	fields: Upload[],
	scope: UrlScope,
): Promise<Record<string, unknown>> {
	const out = { ...record };
	for (const field of fields) {
		const envelope = (path: string) => toEnvelope(scope, field, path);
		const value = out[field.name];
		out[field.name] = field.isTranslatableField()
			? await perLocale(value, (v) => normalize(v, field.isMultiple(), envelope))
			: await normalize(value, field.isMultiple(), envelope);
	}
	return out;
}

async function toEnvelope(scope: UrlScope, field: Upload, path: string): Promise<StoredFile> {
	return {
		path,
		url: await uploadUrl(scope, { field: field.name, config: fieldConfig(field), path }),
	};
}

async function perLocale(value: unknown, each: (v: unknown) => Promise<unknown>) {
	if (value === null || typeof value !== "object" || pathOf(value) !== null) {
		return each(value);
	}
	const entries = Object.entries(value as Record<string, unknown>);
	return Object.fromEntries(await Promise.all(entries.map(async ([k, v]) => [k, await each(v)])));
}

async function normalize(
	value: unknown,
	multiple: boolean,
	envelope: (path: string) => Promise<StoredFile>,
): Promise<unknown> {
	const single = pathOf(value);
	if (single !== null) {
		return envelope(single);
	}
	if (!multiple || !Array.isArray(value)) {
		return value ?? null;
	}
	const paths = value.flatMap((item) => pathOf(item) ?? []);
	return Promise.all(paths.map(envelope));
}

/** A bare stored path or a `{path, url}` envelope; anything else is not a file. */
export function pathOf(value: unknown): string | null {
	if (typeof value === "string") {
		return value;
	}
	const path = (value as { path?: unknown } | null)?.path;
	return typeof path === "string" ? path : null;
}
