import { useState } from "react";
import Cropper from "react-easy-crop";
import { useTranslation } from "../i18n/i18n";
import type { CropArea } from "./imageCrop";

interface Size {
	width: number;
	height: number;
}

export function CropRange({
	label,
	value,
	min = 10,
	max = 100,
	step = 1,
	onChange,
}: {
	label: string;
	value: number;
	min?: number;
	max?: number;
	step?: number;
	onChange: (value: number) => void;
}) {
	return (
		<label className="flex items-center gap-3 text-sm">
			<span className="min-w-24">{label}</span>
			<input
				type="range"
				className="w-full"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(event) => onChange(Number(event.target.value))}
			/>
		</label>
	);
}

function useEditor(aspectRatio?: number) {
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [baseSize, setBaseSize] = useState<Size>();
	const [width, setWidth] = useState(100);
	const [height, setHeight] = useState(100);
	const free = aspectRatio === undefined;
	const cropSize =
		free && baseSize
			? { width: (baseSize.width * width) / 100, height: (baseSize.height * height) / 100 }
			: undefined;
	return {
		free,
		zoom,
		setZoom,
		width,
		setWidth,
		height,
		setHeight,
		cropper: {
			crop,
			zoom,
			cropSize,
			onCropChange: setCrop,
			onZoomChange: setZoom,
			onCropSizeChange: (size: Size) => setBaseSize((current) => current ?? size),
		},
	};
}

export function ImageCropEditor({
	url,
	aspectRatio,
	onComplete,
	onError,
}: {
	url: string;
	aspectRatio?: number;
	onComplete: (area: CropArea) => void;
	onError: () => void;
}) {
	const state = useEditor(aspectRatio);
	return (
		<>
			<div className="relative h-72 w-full overflow-hidden rounded bg-black">
				<Cropper
					{...state.cropper}
					image={url}
					aspect={aspectRatio}
					onCropComplete={(_area, pixels) => onComplete(pixels)}
					mediaProps={{ onError }}
				/>
			</div>
			<CropControls state={state} />
		</>
	);
}

function CropControls({ state }: { state: ReturnType<typeof useEditor> }) {
	const t = useTranslation();
	return (
		<>
			<CropRange
				label={t("field.upload.cropZoom")}
				min={1}
				max={3}
				step={0.01}
				value={state.zoom}
				onChange={state.setZoom}
			/>
			{state.free && (
				<>
					<CropRange
						label={t("field.upload.cropWidth")}
						value={state.width}
						onChange={state.setWidth}
					/>
					<CropRange
						label={t("field.upload.cropHeight")}
						value={state.height}
						onChange={state.setHeight}
					/>
				</>
			)}
		</>
	);
}
