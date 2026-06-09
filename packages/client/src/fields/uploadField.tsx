import { UploadIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useClient } from "../data/client";
import { uploadFile } from "../data/upload";
import { useTranslation } from "../i18n/i18n";
import { useNearestRow } from "../structure/rowContext";
import { Button } from "../ui/button";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";

export interface UploadValue {
	filename: string;
	url: string;
}

interface UploadOptionsBag {
	entity?: string;
	accept?: string;
	maxFileSize?: number;
}

interface UploadRowShape {
	mimeType?: string;
	url?: string;
	filename?: string;
	sizes?: Array<{ url: string; width: number }>;
}

export function UploadForm({
	id,
	name,
	value,
	onChange,
	options,
}: FieldFormProps<UploadValue, UploadOptionsBag>) {
	const t = useTranslation();
	const client = useClient();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const entity = options?.entity;
	const onFiles = async (files: FileList | null) => {
		const file = files?.[0];
		if (!file) {
			return;
		}
		if (!entity) {
			setError("upload field is missing entity option");
			return;
		}
		setBusy(true);
		setError(null);
		const res = await uploadFile({
			client,
			entityName: entity,
			file,
		});
		setBusy(false);
		if (res.error) {
			setError(res.error.message);
			return;
		}
		if (!res.data) {
			setError(t("field.upload.noData"));
			return;
		}
		// Pass the full UploadRow through: server-side submit handlers
		// persist mimeType/filesize/dimensions/sizes, not just the link.
		onChange({ ...res.data });
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
			id={id ?? name}
			name={name}
			accept={options?.accept}
			busy={busy}
			error={error}
			onFiles={onFiles}
		/>
	);
}

interface PreviewProps {
	value: UploadValue;
	onRemove: () => void;
}

function UploadPreview({ value, onRemove }: PreviewProps) {
	const isImg = looksLikeImage(value.url, value.filename);
	return (
		<div className="flex items-center gap-3 rounded-md border p-2">
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

interface PickerProps {
	id: string;
	name: string;
	accept?: string;
	busy: boolean;
	error: string | null;
	onFiles: (files: FileList | null) => void;
}

function UploadPicker({ id, name, accept, busy, error, onFiles }: PickerProps) {
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
					className="sr-only"
					disabled={busy}
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

// Smallest variant by width — thumbnail source, falls back to the full url.
function thumbnailUrl(sizes: UploadRowShape["sizes"], fallback: string): string {
	const variants = sizes ?? [];
	if (variants.length === 0) {
		return fallback;
	}
	return variants.reduce((a, b) => (b.width < a.width ? b : a)).url ?? fallback;
}

export function UploadCell({ value }: FieldCellProps<UploadValue>) {
	const row = useNearestRow() as UploadRowShape | null;
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

function looksLikeImage(url: string, filename: string): boolean {
	const target = (url + filename).toLowerCase();
	return /\.(png|jpe?g|gif|webp|avif|heic|svg)(\?|$)/.test(target);
}
