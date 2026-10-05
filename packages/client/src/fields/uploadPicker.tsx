import { UploadIcon } from "lucide-react";
import { useTranslation } from "../i18n/i18n";

interface HiddenFileInputProps {
	id: string;
	name: string;
	accept?: string;
	multiple?: boolean;
	disabled: boolean;
	className: string;
	onBlur?: () => void;
	invalid?: boolean;
	describedBy?: string;
	onFiles: (files: File[]) => void;
}

// Owns the field id, validation state and blur. sr-only, not display:none, so it
// stays tabbable and opens the file dialog from the keyboard.
export function HiddenFileInput({
	id,
	name,
	accept,
	multiple,
	disabled,
	className,
	onBlur,
	invalid,
	describedBy,
	onFiles,
}: HiddenFileInputProps) {
	return (
		<input
			id={id}
			name={name}
			type="file"
			accept={accept}
			multiple={multiple}
			className={className}
			disabled={disabled}
			onBlur={onBlur}
			aria-invalid={invalid || undefined}
			aria-describedby={describedBy}
			onChange={(e) => {
				const files = Array.from(e.currentTarget.files ?? []);
				// Reset so picking the same file again still fires onChange.
				e.currentTarget.value = "";
				onFiles(files);
			}}
		/>
	);
}

export function UploadError({ error }: { error: string | null }) {
	if (!error) {
		return null;
	}
	return (
		<p role="alert" className="text-sm text-destructive">
			{error}
		</p>
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
	onBlur?: () => void;
	invalid?: boolean;
	describedBy?: string;
	onFiles: (files: File[]) => void;
}

export function UploadPicker({ busy, disabled, error, ...input }: PickerProps) {
	const t = useTranslation();
	return (
		<div className="space-y-2">
			<label
				htmlFor={input.id}
				className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-sm text-muted-foreground hover:border-foreground"
			>
				<UploadIcon className="h-5 w-5" aria-hidden />
				<span>{busy ? t("field.upload.uploading") : t("field.upload.prompt")}</span>
				<HiddenFileInput
					{...input}
					className="sr-only"
					disabled={busy || Boolean(disabled)}
				/>
			</label>
			<UploadError error={error} />
		</div>
	);
}
