import { type FormBuilder, materialize, Upload, type WireNode } from "../../dsl";
import { trans } from "../../i18n";
import type { EndpointCtx } from "../endpoints/types";
import { HttpError } from "../http";
import type { SessionStore } from "../inertia/session";
import { type FieldConfig, fieldConfig } from "../uploads/config";
import { rememberIssued } from "../uploads/issued";
import { storeUpload } from "../uploads/store";
import { dataSet } from "../validation/data";
import { AgentError } from "./answer";
import { content, httpUrl } from "./download";
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
	/** Where a throwing fetchRemote goes (McpConfig.report); the agent gets download_failed. */
	report: (error: unknown) => void;
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
	const targets: { at: Target; value: unknown }[] = [];
	for (const [key, field] of Object.entries(formShape(form).fields)) {
		if (field instanceof Upload) {
			// The materialized node, as describeFields() reads it for the schema.
			const node = await materialize<WireNode>(field.toNode());
			const multiple = node.options.multiple === true;
			targets.push(
				...sent(key, input).map(([path, value]) => ({
					at: { field, path, env, multiple },
					value,
				})),
			);
		}
	}
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
	const { multiple } = at;
	if (multiple && isRemote(value)) {
		throw new AgentError(`${at.path}: a multiple field takes a list; send [{url}].`);
	}
	if (!placed(value, multiple, at.field.isTranslatableField())) {
		throw new AgentError(
			`${at.path}: send {url} as the value, in a list when the field is multiple, or per locale when it is translatable.`,
		);
	}
}

const isScalar = (value: unknown): value is string | number | boolean | null | undefined =>
	value === null || typeof value !== "object";

/** Whether `value` has the field's shape: a value, a list (multiple) or one per locale (translatable); `{url}` only as a value. */
function placed(value: unknown, multiple: boolean, translatable: boolean): boolean {
	if (isRemote(value)) {
		return !(multiple || translatable);
	}
	if (isScalar(value)) {
		return true;
	}
	if (Object.keys(value).length === 0) {
		return translatable || (multiple && Array.isArray(value));
	}
	if (Array.isArray(value)) {
		return multiple && value.every((entry) => isRemote(entry) || isScalar(entry));
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
	multiple: boolean;
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
	const file = await fetchFile(at, ref, config);
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

/** UrlFetcher::fetch() over the host's fetch: http(s) only, a 2xx answer, within the size cap, of a type the field accepts. */
async function fetchFile(at: Target, ref: Reference, config: FieldConfig): Promise<File> {
	const refuse = (key: string) => new AgentError(`${at.path}: ${trans(`media.errors.${key}`)}`);
	const url = httpUrl(ref.url);
	if (url === null) {
		throw refuse("blocked_url");
	}
	// Through a promise step, so a fetchRemote that throws synchronously is reported too.
	const response = await Promise.resolve(url.href)
		.then(at.env.fetchRemote)
		.catch((error: unknown) => {
			at.env.report(error);
			return null;
		});
	if (response?.ok !== true) {
		await response?.body?.cancel().catch(() => null);
		throw refuse("download_failed");
	}
	const file = await content(response, config);
	if (typeof file === "string") {
		throw refuse(file);
	}
	return new File([file.bytes], ref.name ?? fileName(url), { type: file.type });
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
