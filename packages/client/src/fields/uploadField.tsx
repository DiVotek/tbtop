import { UploadIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { type AdminClient, useClient } from "../data/client";
import { unwrapData } from "../data/envelope";
import { type UploadRow, uploadFile } from "../data/upload";
import { type Translate, useTranslation } from "../i18n/i18n";
import { useClientActionContext } from "../structure/actionContext";
import { useNearestRow } from "../structure/rowContext";
import type { ClientActionContext } from "../structure/types";
import { Button } from "../ui/button";
import { type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";
import { UploadMultiForm } from "./uploadMultiField";

export interface UploadValue {
	filename: string;
	url: string;
}

type UploadFn = (ctx: ClientActionContext, file: File, signal?: AbortSignal) => Promise<unknown>;

export interface UploadOptionsBag {
	entity?: string;
	accept?: string;
	maxSize?: number;
	maxFileSize?: number;
	upload?: UploadFn;
	multiple?: boolean;
	maxFiles?: number;
	reorderable?: boolean;
}

interface UploadRowShape {
	mimeType?: string;
	url?: string;
	filename?: string;
	sizes?: Array<{ url: string; width: number }>;
}

export function UploadForm(props: FieldFormProps<UploadValue | UploadValue[], UploadOptionsBag>) {
	if (props.options?.multiple) {
		return <UploadMultiForm {...props} />;
	}
	return <UploadSingleForm {...(props as FieldFormProps<UploadValue, UploadOptionsBag>)} />;
}

function UploadSingleForm({
	id,
	name,
	value,
	onChange,
	disabled,
	options,
}: FieldFormProps<UploadValue, UploadOptionsBag>) {
	const t = useTranslation();
	const ctx = useClientActionContext();
	const client = useClient();
	const opts = options ?? {};
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const onFiles = async (files: FileList | null) => {
		const file = files?.[0];
		if (!file) {
			return;
		}
		if (exceedsMaxSize(opts, file)) {
			setError(t("field.upload.tooLarge", "File exceeds the maximum size"));
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const row = await runUpload({ opts, ctx, client, file, t });
			onChange({ ...row });
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	};
	if (value) {
		return (
			<UploadPreview
				value={value}
				onRemove={() => {
					setError(null);
					onChange(null);
				}}
			/>
		);
	}
	return (
		<UploadPicker
			id={fieldId({ id, name })}
			name={name}
			accept={opts.accept}
			busy={busy}
			disabled={disabled}
			error={error}
			onFiles={onFiles}
		/>
	);
}

export interface RunUploadInput {
	opts: UploadOptionsBag;
	ctx: ClientActionContext;
	client: AdminClient;
	file: File;
	t: Translate;
}

export async function runUpload({
	opts,
	ctx,
	client,
	file,
	t,
}: RunUploadInput): Promise<UploadRow> {
	if (opts.upload) {
		const raw = await opts.upload(ctx, file);
		return unwrapData(raw) as UploadRow;
	}
	if (opts.entity) {
		const res = await uploadFile({ client, entityName: opts.entity, file });
		if (res.error) {
			throw new Error(res.error.message);
		}
		if (!res.data) {
			throw new Error(t("field.upload.noData"));
		}
		return res.data;
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

interface PreviewProps {
	value: UploadValue;
	onRemove: () => void;
}

export function UploadPreview({ value: raw, onRemove }: PreviewProps) {
	const value = asUploadValue(raw);
	const isImg = looksLikeImage(value.url, value.filename);
	return (
		<div data-testid="upload-preview" className="flex items-center gap-3 rounded-md border p-2">
			{isImg ? (
				<img
					src={value.url}
					alt={value.filename}
					className="h-12 w-12 rounded object-cover"
				/>
			) : (
				<div className="h-12 w-12 rounded bg-muted" />
			)}
			<span className="flex-1 truncate text-sm">{value.filename}</span>
			<Button type="button" variant="ghost" size="sm" aria-label="Remove" onClick={onRemove}>
				<XIcon className="h-4 w-4" />
			</Button>
		</div>
	);
}

export interface PickerProps {
	id: string;
	name: string;
	accept?: string;
	multiple?: boolean;
	busy: boolean;
	disabled?: boolean;
	error: string | null;
	onFiles: (files: FileList | null) => void;
}

export function UploadPicker({
	id,
	name,
	accept,
	multiple,
	busy,
	disabled,
	error,
	onFiles,
}: PickerProps) {
	const t = useTranslation();
	return (
		<div className="space-y-2">
			<label
				htmlFor={id}
				className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-sm text-muted-foreground hover:border-foreground"
			>
				<UploadIcon className="h-5 w-5" aria-hidden />
				<span>{busy ? t("field.upload.uploading") : t("field.upload.prompt")}</span>
				<input
					id={id}
					name={name}
					type="file"
					accept={accept}
					multiple={multiple}
					className="sr-only"
					disabled={busy || disabled}
					onChange={(e) => onFiles(e.target.files)}
				/>
			</label>
			{error ? (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			) : null}
		</div>
	);
}

function thumbnailUrl(sizes: UploadRowShape["sizes"], fallback: string): string {
	const variants = sizes ?? [];
	if (variants.length === 0) {
		return fallback;
	}
	return variants.reduce((a, b) => (b.width < a.width ? b : a)).url ?? fallback;
}

export function UploadCell({ value }: FieldCellProps<UploadValue | UploadValue[]>) {
	const row = useNearestRow() as UploadRowShape | null;
	if (Array.isArray(value)) {
		if (value.length === 0) {
			return null;
		}
		const first = value[0];
		if (!first) {
			return null;
		}
		const isImg = looksLikeImage(first.url, first.filename);
		return (
			<span className="flex items-center gap-1.5">
				{isImg ? (
					<img
						src={first.url}
						alt={first.filename}
						className="h-8 w-8 rounded object-cover"
					/>
				) : null}
				<span className="text-muted-foreground">{value.length}</span>
			</span>
		);
	}
	const mime = row?.mimeType;
	const url = row?.url ?? value?.url;
	const filename = row?.filename ?? value?.filename;
	if (!url && !filename) {
		return null;
	}
	if (mime?.startsWith("image/") && url) {
		return (
			<img
				src={thumbnailUrl(row?.sizes, url)}
				alt={filename ?? ""}
				className="h-8 w-8 rounded object-cover"
			/>
		);
	}
	return <span>{filename}</span>;
}

export function looksLikeImage(url: unknown, filename: unknown): boolean {
	const target = (String(url ?? "") + String(filename ?? "")).toLowerCase();
	return /\.(png|jpe?g|gif|webp|avif|heic|svg)(\?|$)/.test(target);
}

function asUploadValue(value: UploadValue | string): UploadValue {
	return typeof value === "string" ? { url: value, filename: value } : value;
}
