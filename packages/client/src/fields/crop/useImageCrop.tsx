import { lazy, type ReactNode, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { type CropOptions, isCroppable } from "./cropOptions";

// react-image-crop loads only when a crop dialog first opens.
const LazyCropDialog = lazy(() => import("./cropDialog").then((m) => ({ default: m.CropDialog })));

interface CropJob {
	file: File;
	resolve: (file: File | null) => void;
}

export interface ImageCrop {
	/** Resolves to the file to upload: cropped, passed through, or null when cancelled. */
	cropFile: (file: File) => Promise<File | null>;
	/** The open dialog, if any; render it next to the field. */
	dialog: ReactNode;
}

/** Puts a crop step in front of an upload when the field has `image.crop`. */
export function useImageCrop(options: CropOptions | undefined): ImageCrop {
	const [job, setJob] = useState<CropJob | null>(null);
	const jobRef = useRef<CropJob | null>(null);
	jobRef.current = job;

	// An upload awaiting the dialog must not hang if the field unmounts mid-crop.
	useEffect(() => () => jobRef.current?.resolve(null), []);

	const cropFile = useCallback(
		(file: File): Promise<File | null> => {
			if (!options || !isCroppable(file)) {
				return Promise.resolve(file);
			}
			return new Promise((resolve) => setJob({ file, resolve }));
		},
		[options],
	);

	const finish = (file: File | null) => {
		job?.resolve(file);
		setJob(null);
	};

	const dialog =
		job && options ? (
			<Suspense fallback={null}>
				<LazyCropDialog
					key={`${job.file.name}-${job.file.lastModified}`}
					file={job.file}
					options={options}
					onDone={finish}
				/>
			</Suspense>
		) : null;

	return { cropFile, dialog };
}
