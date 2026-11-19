import { useMemo, useRef } from "react";
import { UploadProgressList } from "../media/uploadProgressList";
import type { FieldFormProps } from "./fieldProps";
import { UploadMultiItems } from "./uploadMultiItems";
import { UploadPicker } from "./uploadPicker";
import type { UploadOptionsBag, UploadValue } from "./uploadUtils";
import { uploadValues } from "./uploadValues";
import { useImageCrop } from "./useImageCrop";
import { useUploadFiles } from "./useUploadBatch";

type Props = FieldFormProps<UploadValue | UploadValue[] | string | string[], UploadOptionsBag>;

export function UploadMultiForm(props: Props) {
	const { options, value, onChange, disabled } = props;
	const opts = useMemo(() => options ?? {}, [options]);
	const { prepare, dialog } = useImageCrop(opts);

	const items = uploadValues(value);
	const canAddMore = !opts.maxFiles || items.length < opts.maxFiles;

	const valueRef = useRef(value);
	valueRef.current = value;

	const { tasks, error, uploadFiles } = useUploadFiles({ opts, valueRef, onChange, prepare });
	const uploading = tasks.some(
		(task) => task.status === "uploading" || task.status === "pending",
	);

	return (
		<div className="space-y-3">
			{dialog}
			<UploadMultiItems
				items={items}
				disabled={disabled}
				reorderable={opts.reorderable}
				onChange={onChange}
			/>
			<UploadProgressList tasks={tasks.filter((task) => task.status !== "done")} />

			{canAddMore ? (
				<UploadMultiPicker
					props={props}
					busy={uploading}
					error={error}
					onFiles={uploadFiles}
				/>
			) : null}
		</div>
	);
}

function UploadMultiPicker({
	props,
	...state
}: {
	props: Props;
	busy: boolean;
	error: string | null;
	onFiles: (files: File[]) => void;
}) {
	return (
		<UploadPicker
			{...state}
			id={props.id ?? props.name}
			name={props.name}
			accept={props.options?.accept}
			multiple
			disabled={props.disabled}
			onBlur={props.onBlur}
			invalid={props.invalid}
			describedBy={props.describedBy}
		/>
	);
}
