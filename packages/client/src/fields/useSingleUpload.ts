import { useState } from "react";
import {
	exceedsMaxSize,
	runUpload,
	type UploadOptionsBag,
	type UploadValue,
	useUploadDependencies,
} from "./uploadUtils";
import { useImageCrop } from "./useImageCrop";

export function useSingleUpload(
	opts: UploadOptionsBag,
	onChange: (value: UploadValue | null) => void,
) {
	const { t, ctx, client } = useUploadDependencies();
	const { prepare, dialog } = useImageCrop(opts);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const onFiles = async (files: File[]) => {
		const picked = files[0];
		if (!picked) {
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const file = await prepare(picked);
			if (!file) {
				return;
			}
			if (exceedsMaxSize(opts, file)) {
				setError(t("field.upload.tooLarge", "File exceeds the maximum size"));
				return;
			}
			onChange(await runUpload({ opts, ctx, client, file }));
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	};
	const onRemove = () => {
		setError(null);
		onChange(null);
	};
	return { dialog, busy, error, onFiles, onRemove };
}
