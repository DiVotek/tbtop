import { useEffect, useRef, useState } from "react";
import ReactCrop, { centerCrop, makeAspectCrop, type PercentCrop } from "react-image-crop";
import { useTranslation } from "../../i18n/i18n";
import { Button } from "../../ui/button";
import { ModalShell } from "../../ui/modal-shell";
import { ToggleGroup, ToggleGroupItem } from "../../ui/toggle-group";
import { cropImage, type PixelArea } from "./cropImage";
import { type AspectChoice, type CropOptions, parseAspects } from "./cropOptions";

export interface CropDialogProps {
	file: File;
	options: CropOptions;
	/** Called once: the cropped file, or null when the person cancels. */
	onDone: (file: File | null) => void;
}

/** Initial selection: 90% of the image, centred, at the aspect when one is set. */
export function initialCrop(ratio: number | undefined, width: number, height: number): PercentCrop {
	if (!ratio) {
		return { unit: "%", x: 5, y: 5, width: 90, height: 90 };
	}
	return centerCrop(
		makeAspectCrop({ unit: "%", width: 90 }, ratio, width, height),
		width,
		height,
	);
}

/** Percent selection → pixel rectangle on the image's natural size. */
export function toPixelArea(
	crop: PercentCrop,
	naturalWidth: number,
	naturalHeight: number,
): PixelArea {
	return {
		x: (crop.x / 100) * naturalWidth,
		y: (crop.y / 100) * naturalHeight,
		width: (crop.width / 100) * naturalWidth,
		height: (crop.height / 100) * naturalHeight,
	};
}

export function CropDialog({ file, options, onDone }: CropDialogProps) {
	const t = useTranslation();
	const choices = parseAspects(options.aspects);
	const [aspect, setAspect] = useState<AspectChoice>(choices[0] as AspectChoice);
	const [crop, setCrop] = useState<PercentCrop>();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const imgRef = useRef<HTMLImageElement>(null);
	const src = useObjectUrl(file);

	const reset = (ratio: number | undefined) => {
		const img = imgRef.current;
		if (img) {
			setCrop(initialCrop(ratio, img.width, img.height));
		}
	};

	const pickAspect = (label: string) => {
		const next = choices.find((c) => c.label === label);
		if (next) {
			setAspect(next);
			reset(next.ratio);
		}
	};

	const apply = async () => {
		const img = imgRef.current;
		if (!img || !crop || crop.width === 0 || crop.height === 0) {
			return;
		}
		setBusy(true);
		setError(null);
		try {
			onDone(await cropImage(file, toPixelArea(crop, img.naturalWidth, img.naturalHeight)));
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setBusy(false);
		}
	};

	return (
		<ModalShell
			open
			onOpenChange={(open) => !open && !busy && onDone(null)}
			title={t("field.upload.crop.title", "Crop image")}
			size="2xl"
			data-testid="upload-crop-dialog"
			footer={
				<>
					<Button
						type="button"
						variant="outline"
						disabled={busy}
						onClick={() => onDone(null)}
					>
						{t("action.cancel")}
					</Button>
					<Button type="button" disabled={busy || !crop} onClick={apply}>
						{t("field.upload.crop.apply", "Crop")}
					</Button>
				</>
			}
		>
			{choices.length > 1 && (
				<ToggleGroup
					type="single"
					value={aspect.label}
					onValueChange={pickAspect}
					aria-label={t("field.upload.crop.aspect", "Aspect ratio")}
				>
					{choices.map((c) => (
						<ToggleGroupItem key={c.label} value={c.label}>
							{c.ratio ? c.label : t("field.upload.crop.free", "Free")}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			)}
			<div className="flex justify-center rounded-surface bg-muted/40 p-2">
				{src && (
					<ReactCrop
						crop={crop}
						onChange={(_, percent) => setCrop(percent)}
						aspect={aspect.ratio}
						circularCrop={options.shape === "round"}
						keepSelection
						ruleOfThirds
						disabled={busy}
					>
						<img
							ref={imgRef}
							src={src}
							alt={file.name}
							className="max-h-[60vh] w-auto"
							onLoad={() => reset(aspect.ratio)}
							// A file the browser cannot decode uploads unchanged, like any non-croppable file.
							onError={() => onDone(file)}
						/>
					</ReactCrop>
				)}
			</div>
			{error && <p className="text-sm text-destructive">{error}</p>}
		</ModalShell>
	);
}

function useObjectUrl(file: File): string | undefined {
	const [url, setUrl] = useState<string>();
	useEffect(() => {
		const next = URL.createObjectURL(file);
		setUrl(next);
		return () => URL.revokeObjectURL(next);
	}, [file]);
	return url;
}
