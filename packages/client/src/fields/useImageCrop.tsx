import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { isCroppable } from "./imageCrop";
import { ImageCropDialog } from "./imageCropDialog";
import type { UploadOptionsBag } from "./uploadUtils";

interface CropRequest {
	id: number;
	file: File;
	resolve: (file?: File) => void;
}

function useCropLifetime(pending: RefObject<{ active?: CropRequest }>) {
	const mounted = useRef(true);
	useEffect(() => {
		const current = pending.current;
		mounted.current = true;
		return () => {
			mounted.current = false;
			current.active?.resolve();
		};
	}, [pending]);
	return mounted;
}

export function useImageCrop(options: UploadOptionsBag) {
	const [request, setRequest] = useState<CropRequest>();
	const pending = useRef<{ active?: CropRequest }>({});
	const sequence = useRef(0);
	const mounted = useCropLifetime(pending);
	const prepare = useCallback(
		async (file: File): Promise<File | undefined> => {
			if (!mounted.current) {
				return;
			}
			if (!options.image?.crop || !isCroppable(file)) {
				return file;
			}
			return new Promise((resolve) => {
				sequence.current += 1;
				pending.current.active = { id: sequence.current, file, resolve };
				setRequest(pending.current.active);
			});
		},
		[options.image?.crop, mounted],
	);
	const finish = (file?: File) => {
		pending.current.active?.resolve(file);
		pending.current.active = undefined;
		setRequest(undefined);
	};
	const dialog = request ? (
		<ImageCropDialog
			key={request.id}
			file={request.file}
			aspectRatio={options.image?.crop?.aspectRatio}
			onDone={finish}
		/>
	) : undefined;
	return { prepare, dialog };
}
