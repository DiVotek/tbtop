import { type FieldFormProps, fieldId } from "./fieldProps";
import { UploadMultiForm } from "./uploadMultiField";
import { UploadPicker } from "./uploadPicker";
import { UploadPreview } from "./uploadPreview";
import type { UploadOptionsBag, UploadValue } from "./uploadUtils";
import { useSingleUpload } from "./useSingleUpload";

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

function UploadSingleForm(props: FieldFormProps<UploadValue | string, UploadOptionsBag>) {
	const { dialog, onRemove, ...state } = useSingleUpload(props.options ?? {}, props.onChange);
	const preview = normalizeUploadValue(props.value);
	const picker = {
		id: fieldId(props),
		name: props.name,
		accept: props.options?.accept,
		disabled: props.disabled,
		onBlur: props.onBlur,
		invalid: props.invalid,
		describedBy: props.describedBy,
		...state,
	};
	return (
		<>
			{dialog}
			{preview ? (
				<UploadPreview {...picker} value={preview} onRemove={onRemove} />
			) : (
				<UploadPicker {...picker} />
			)}
		</>
	);
}
