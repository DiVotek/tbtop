import { type FormBuilder, Upload } from "../../dsl";
import { trans } from "../../i18n";
import type { EndpointCtx } from "../endpoints/types";
import { HttpError } from "../http";
import type { SessionStore } from "../inertia/session";
import { fieldConfig } from "../uploads/config";
import { rememberIssued } from "../uploads/issued";
import { storeUpload } from "../uploads/store";
import { dataSet } from "../validation/data";
import { AgentError } from "./answer";
import { formShape } from "./formArgs";
import { isRemote } from "./formFields";
import { sent } from "./formInput";

/** The host's fetch for `{url}` values (McpConfig.fetchRemote): it owns the SSRF policy. */
export type FetchRemote = (url: string) => Promise<Response>;

/** Downloads one execute() may trigger, counted before the first one starts. */
const MAX_PER_CALL = 20;

export interface RemoteEnv {
	fetchRemote: FetchRemote;
	options: EndpointCtx["options"];
	/** The session execute() runs on, so the issued path passes the upload rule. */
	session: SessionStore;
}

/**
 * RemoteFiles::fetchInto(): `input` with every `{url}` in an upload field
 * replaced by the stored path, issued to this session as the upload endpoint
 * would. Media stays excluded: the Node runtime has no media library.
 */
export async function fetchInto(
	form: FormBuilder,
	input: Record<string, unknown>,
	env: RemoteEnv,
): Promise<Record<string, unknown>> {
	const targets = Object.entries(formShape(form).fields).flatMap(([key, field]) =>
		field instanceof Upload
			? sent(key, input).map(([path, value]) => ({ at: { field, path, env }, value }))
			: [],
	);
	for (const { at, value } of targets) {
		assertPlaced(at, value);
	}
	const count = targets.reduce((sum, target) => sum + references(target.value), 0);
	if (count > MAX_PER_CALL) {
		throw new AgentError(
			`At most ${MAX_PER_CALL} files may be sent as {url} in one call; this one has ${count}.`,
		);
	}
	for (const { at, value } of targets) {
		dataSet(input, at.path, await resolve(at, value));
	}
	return input;
}

/** RemoteFiles::assertPlaced(): a `{url}` only where the field takes a file, refused before any fetch. */
function assertPlaced(at: Target, value: unknown): void {
	const multiple = at.field.toNode().options.multiple === true;
	if (multiple && isRemote(value)) {
		throw new AgentError(`${at.path}: a multiple field takes a list; send [{url}].`);
	}
	if (!placed(value, multiple, at.field.isTranslatableField())) {
		throw new AgentError(
			`${at.path}: send {url} as the value, in a list when the field is multiple, or per locale when it is translatable.`,
		);
	}
}

/** Whether every `{url}` in `value` is the value, a list entry (multiple) or a locale's value (translatable). */
function placed(value: unknown, multiple: boolean, translatable: boolean): boolean {
	if (isRemote(value)) {
		return !multiple;
	}
	if (value === null || typeof value !== "object" || references(value) === 0) {
		return true;
	}
	if (Array.isArray(value)) {
		return multiple && value.every((entry) => isRemote(entry) || references(entry) === 0);
	}
	return translatable && Object.values(value).every((entry) => placed(entry, multiple, false));
}

/** The remote references in `value`: itself, or those in its list or locale map. */
function references(value: unknown): number {
	if (isRemote(value)) {
		return 1;
	}
	return value !== null && typeof value === "object"
		? Object.values(value).reduce((sum: number, entry) => sum + references(entry), 0)
		: 0;
}

/** Where a reference is stored: the field, its concrete input path (for errors), the env. */
interface Target {
	field: Upload;
	path: string;
	env: RemoteEnv;
}

type Reference = { url: string; name?: string };

/** `value` with its remote references stored: a single one, a list of them, or one per locale. */
async function resolve(at: Target, value: unknown): Promise<unknown> {
	if (isRemote(value)) {
		return upload(at, value);
	}
	if (value === null || typeof value !== "object") {
		return value;
	}
	const out: [string, unknown][] = [];
	for (const [key, entry] of Object.entries(value)) {
		out.push([key, await resolve(at, entry)]);
	}
	return Array.isArray(value) ? out.map(([, entry]) => entry) : Object.fromEntries(out);
}

async function upload(at: Target, ref: Reference): Promise<string> {
	const { field, path, env } = at;
	const config = fieldConfig(field);
	const file = await fetchFile(at, ref, config.maxSize);
	const saver = field.saveClosure();
	try {
		const stored = saver
			? await saver(file, { ...config })
			: await storeUpload(file, config, env.options);
		await rememberIssued(env.session, field.name, stored.path);
		return stored.path;
	} catch (error) {
		throw error instanceof HttpError ? new AgentError(`${path}: ${error.message}`) : error;
	}
}

/** UrlFetcher::fetch() over the host's fetch: http(s) only, a 2xx answer, within the size cap. */
async function fetchFile(at: Target, ref: Reference, maxSize: number): Promise<File> {
	const refuse = (key: string) => new AgentError(`${at.path}: ${trans(`media.errors.${key}`)}`);
	const url = httpUrl(ref.url);
	if (url === null) {
		throw refuse("blocked_url");
	}
	const response = await at.env.fetchRemote(url.href).catch(() => null);
	if (response?.ok !== true) {
		throw refuse("download_failed");
	}
	const bytes = await body(response, maxSize);
	if (typeof bytes === "string") {
		throw refuse(bytes);
	}
	const type = response.headers.get("content-type") ?? "";
	return new File([bytes], ref.name ?? fileName(url), { type: type.split(";")[0]?.trim() });
}

const httpUrl = (raw: string): URL | null => {
	const url = URL.canParse(raw) ? new URL(raw) : null;
	return url !== null && ["http:", "https:"].includes(url.protocol) ? url : null;
};

/** The response body, or the error key when it is over `maxSize` or breaks off; read until the cap, no further. */
async function body(
	response: Response,
	maxSize: number,
): Promise<Uint8Array<ArrayBuffer> | string> {
	if (Number(response.headers.get("content-length") ?? 0) > maxSize) {
		return "file_too_large";
	}
	const chunks = await readCapped(response, maxSize).catch(() => "download_failed");
	if (typeof chunks === "string") {
		return chunks;
	}
	const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0));
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes;
}

/** The body's chunks, or "file_too_large" once they pass `maxSize` (the rest is never downloaded). */
async function readCapped(response: Response, maxSize: number): Promise<Uint8Array[] | string> {
	const reader = response.body?.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	for (let read = await reader?.read(); read && !read.done; read = await reader?.read()) {
		size += read.value.byteLength;
		if (size > maxSize) {
			await reader?.cancel();
			return "file_too_large";
		}
		chunks.push(read.value);
	}
	return chunks;
}

/** The URL's last path segment, as a browser names a download. */
function fileName(url: URL): string {
	const segment = url.pathname.split("/").pop() ?? "";
	try {
		return decodeURIComponent(segment) || "download";
	} catch {
		return segment;
	}
}
