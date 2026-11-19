import { XIcon } from "lucide-react";
import { useTranslation } from "../i18n/i18n";
import { HiddenFileInput, UploadError } from "./uploadPicker";
import { basename, looksLikeImage, type UploadValue } from "./uploadUtils";

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

export function UploadPreview(props: PreviewProps) {
	const t = useTranslation();
	const filename = basename(props.value.path);
	const filenameId = `${props.id}-filename`;
	const isImg = props.value.url !== "" && looksLikeImage(props.value.url, props.value.path);
	return (
		<div className="space-y-2">
			<div className="flex min-h-24 items-center gap-3 rounded-surface border p-2">
				{isImg ? (
					<img
						src={props.value.url}
						alt={filename}
						className="h-12 w-12 rounded object-cover"
					/>
				) : (
					<div className="h-12 w-12 rounded bg-muted" />
				)}
				<span id={filenameId} className="flex-1 truncate text-sm">
					{props.busy ? t("field.upload.uploading") : filename}
				</span>
				<PreviewActions {...props} />
			</div>
			<UploadError error={props.error} />
		</div>
	);
}

function PreviewActions(props: PreviewProps) {
	const t = useTranslation();
	const filenameId = `${props.id}-filename`;
	return (
		<>
			<HiddenFileInput
				id={props.id}
				name={props.name}
				accept={props.accept}
				className="peer sr-only"
				disabled={props.busy || Boolean(props.disabled)}
				onBlur={props.onBlur}
				invalid={props.invalid}
				describedBy={props.describedBy ? `${filenameId} ${props.describedBy}` : filenameId}
				onFiles={props.onFiles}
			/>
			<label
				htmlFor={props.id}
				className="cursor-pointer rounded px-2 py-1 text-sm hover:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50 peer-disabled:pointer-events-none peer-disabled:opacity-50"
			>
				{t("field.upload.replace")}
			</label>
			<button
				type="button"
				className="rounded p-1 hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
				aria-label={t("field.upload.remove")}
				disabled={props.busy || props.disabled}
				onClick={props.onRemove}
			>
				<XIcon className="h-4 w-4" />
			</button>
		</>
	);
}
