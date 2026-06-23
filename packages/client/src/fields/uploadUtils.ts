import { type AdminClient, useClient } from "../data/client";
import { unwrapData } from "../data/envelope";
import type { UploadRow } from "../data/upload";
import { useTranslation } from "../i18n/i18n";
import { useClientActionContext } from "../structure/actionContext";
import type { ClientActionContext } from "../structure/types";

export interface UploadValue {
	path: string;
	url: string;
}

export type UploadFn = (
	ctx: ClientActionContext,
	file: File,
	signal?: AbortSignal,
) => Promise<unknown>;

export interface UploadOptionsBag {
	accept?: string;
	maxSize?: number;
	maxFileSize?: number;
	upload?: UploadFn;
	multiple?: boolean;
	maxFiles?: number;
	reorderable?: boolean;
}

export interface RunUploadInput {
	opts: UploadOptionsBag;
	ctx: ClientActionContext;
	client: AdminClient;
	file: File;
}

export async function runUpload({ opts, ctx, file }: RunUploadInput): Promise<UploadRow> {
	if (opts.upload) {
		const raw = await opts.upload(ctx, file);
		return unwrapData(raw) as UploadRow;
	}
	throw new Error("upload field is missing endpoint");
}

export function exceedsMaxSize(opts: UploadOptionsBag, file: File): boolean {
	const limit = opts.maxSize ?? opts.maxFileSize;
	if (limit === undefined) {
		return false;
	}
	return file.size > limit;
}

export function looksLikeImage(url: string, filename: string): boolean {
	const target = (url + filename).toLowerCase();
	return /\.(png|jpe?g|gif|webp|avif|heic|svg)(\?|$)/.test(target);
}

export function basename(path: string): string {
	return path.split("/").pop()?.split("\\").pop() ?? path;
}

export function serializeUploadValue(value: unknown): unknown {
	if (value === null || value === undefined || typeof value === "string") {
		return value ?? null;
	}
	if (Array.isArray(value)) {
		return value.map(serializeUploadItem);
	}
	return serializeUploadItem(value);
}

function serializeUploadItem(value: unknown): unknown {
	if (typeof value === "string") {
		return value;
	}
	if (isUploadValue(value)) {
		return value.path;
	}
	return value;
}

function isUploadValue(value: unknown): value is UploadValue {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as { path?: unknown }).path === "string"
	);
}

export function useUploadDependencies() {
	return {
		t: useTranslation(),
		ctx: useClientActionContext(),
		client: useClient(),
	};
}
