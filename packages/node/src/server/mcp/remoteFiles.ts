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
import { sent } from "./formInput";

/** The host's fetch for `{url}` values (McpConfig.fetchRemote): it owns the SSRF policy. */
export type FetchRemote = (url: string) => Promise<Response>;

/** Keys a remote reference may carry; any other key makes the value an ordinary one. */
const KEYS = ["url", "alt", "name"];

/** RemoteFiles::isRemote(): a `{url: "https://…"}` reference. */
export function isRemote(value: unknown): value is { url: string; name?: string } {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}
	const ref = value as Record<string, unknown>;
	return typeof ref.url === "string" && Object.keys(ref).every((key) => KEYS.includes(key));
}

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
	for (const [key, field] of Object.entries(formShape(form).fields)) {
		if (!(field instanceof Upload)) {
			continue;
		}
		for (const [path, value] of sent(key, input)) {
			dataSet(input, path, await resolve({ field, path, env }, value));
		}
	}
	return input;
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

/** The response body, or the error key when it is over `maxSize` or breaks off. */
async function body(response: Response, maxSize: number): Promise<ArrayBuffer | string> {
	if (Number(response.headers.get("content-length") ?? 0) > maxSize) {
		return "file_too_large";
	}
	const bytes = await response.arrayBuffer().catch(() => null);
	if (bytes === null) {
		return "download_failed";
	}
	return bytes.byteLength > maxSize ? "file_too_large" : bytes;
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
