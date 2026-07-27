import { UploadIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { type FieldFormProps, fieldId } from "./fieldProps";
import { UploadMultiForm } from "./uploadMultiField";
import {
	basename,
	exceedsMaxSize,
	looksLikeImage,
	runUpload,
	type UploadOptionsBag,
	type UploadValue,
	useUploadDependencies,
} from "./uploadUtils";

export { UploadCell } from "./uploadCell";
export type { RunUploadInput, UploadOptionsBag, UploadValue } from "./uploadUtils";
export {
	basename,
	exceedsMaxSize,
	looksLikeImage,
	runUpload,
	serializeUploadValue,
} from "./uploadUtils";

export function UploadForm(
	props: FieldFormProps<UploadValue | UploadValue[] | string | string[], UploadOptionsBag>,
) {
	if (props.options?.multiple) {
		return <UploadMultiForm {...props} />;
	}
	return (
		<UploadSingleForm {...(props as FieldFormProps<UploadValue | string, UploadOptionsBag>)} />
	);
}

function normalizeUploadValue(value: UploadValue | string | null): UploadValue | null {
	if (!value) {
		return null;
	}
	if (typeof value === "string") {
		return { path: value, url: "" };
	}
	return value;
}

function UploadSingleForm({
	id,
	name,
	value,
	onChange,
	disabled,
	options,
}: FieldFormProps<UploadValue | string, UploadOptionsBag>) {
	const { t, ctx, client } = useUploadDependencies();
	const opts = options ?? {};
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const preview = normalizeUploadValue(value);

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
			const row = await runUpload({ opts, ctx, client, file });
			onChange(row);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	};

	if (preview) {
		return (
			<UploadPreview
				value={preview}
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

interface PreviewProps {
	value: UploadValue;
	onRemove: () => void;
}

function UploadPreview({ value, onRemove }: PreviewProps) {
	const filename = basename(value.path);
	const isImg = value.url !== "" && looksLikeImage(value.url, value.path);
	return (
		<div className="flex min-h-24 items-center gap-3 rounded-md border p-2">
			{isImg ? (
				<img src={value.url} alt={filename} className="h-12 w-12 rounded object-cover" />
			) : (
				<div className="h-12 w-12 rounded bg-muted" />
			)}
			<span className="flex-1 truncate text-sm">{filename}</span>
			<button
				type="button"
				className="rounded p-1 hover:bg-muted"
				aria-label="Remove"
				onClick={onRemove}
			>
				<XIcon className="h-4 w-4" />
			</button>
		</div>
	);
}

interface PickerProps {
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
				className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-sm text-muted-foreground hover:border-foreground"
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
