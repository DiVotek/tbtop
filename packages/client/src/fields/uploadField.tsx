import { XIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { type FieldFormProps, fieldId } from "./fieldProps";
import { UploadMultiForm } from "./uploadMultiField";
import { HiddenFileInput, UploadError, UploadPicker } from "./uploadPicker";
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
	onBlur,
	disabled,
	invalid,
	describedBy,
	options,
}: FieldFormProps<UploadValue | string, UploadOptionsBag>) {
	const { t, ctx, client } = useUploadDependencies();
	const opts = options ?? {};
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const preview = normalizeUploadValue(value);

	const onFiles = async (files: File[]) => {
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
				id={fieldId({ id, name })}
				name={name}
				accept={opts.accept}
				value={preview}
				busy={busy}
				disabled={disabled}
				error={error}
				onBlur={onBlur}
				invalid={invalid}
				describedBy={describedBy}
				onFiles={onFiles}
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
			onBlur={onBlur}
			invalid={invalid}
			describedBy={describedBy}
			onFiles={onFiles}
		/>
	);
}

interface PreviewProps {
	id: string;
	name: string;
	accept?: string;
	value: UploadValue;
	busy: boolean;
	disabled?: boolean;
	error: string | null;
	onBlur?: () => void;
	invalid?: boolean;
	describedBy?: string;
	onFiles: (files: File[]) => void;
	onRemove: () => void;
}

function UploadPreview({
	id,
	name,
	accept,
	value,
	busy,
	disabled,
	error,
	onBlur,
	invalid,
	describedBy,
	onFiles,
	onRemove,
}: PreviewProps) {
	const t = useTranslation();
	const filename = basename(value.path);
	const filenameId = `${id}-filename`;
	const isImg = value.url !== "" && looksLikeImage(value.url, value.path);
	return (
		<div className="space-y-2">
			<div className="flex min-h-24 items-center gap-3 rounded-md border p-2">
				{isImg ? (
					<img
						src={value.url}
						alt={filename}
						className="h-12 w-12 rounded object-cover"
					/>
				) : (
					<div className="h-12 w-12 rounded bg-muted" />
				)}
				<span id={filenameId} className="flex-1 truncate text-sm">
					{busy ? t("field.upload.uploading") : filename}
				</span>
				<HiddenFileInput
					id={id}
					name={name}
					accept={accept}
					className="peer sr-only"
					disabled={busy || Boolean(disabled)}
					onBlur={onBlur}
					invalid={invalid}
					describedBy={describedBy ? `${filenameId} ${describedBy}` : filenameId}
					onFiles={onFiles}
				/>
				<label
					htmlFor={id}
					className="cursor-pointer rounded px-2 py-1 text-sm hover:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50 peer-disabled:pointer-events-none peer-disabled:opacity-50"
				>
					{t("field.upload.replace")}
				</label>
				<button
					type="button"
					className="rounded p-1 hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
					aria-label={t("field.upload.remove")}
					disabled={busy || disabled}
					onClick={onRemove}
				>
					<XIcon className="h-4 w-4" />
				</button>
			</div>
			<UploadError error={error} />
		</div>
	);
}
