import { useEffect, useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { Button } from "../ui/button";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "../ui/revola";
import { type CropArea, cropImage } from "./imageCrop";
import { ImageCropEditor } from "./imageCropEditor";

interface Props {
	file: File;
	aspectRatio?: number;
	onDone: (file?: File) => void;
}

function useCropDialog({ file, onDone }: Props) {
	const [url, setUrl] = useState("");
	const [area, setArea] = useState<CropArea>();
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);
	useEffect(() => {
		const source = URL.createObjectURL(file);
		setUrl(source);
		return () => URL.revokeObjectURL(source);
	}, [file]);
	const confirm = async () => {
		if (!area || busy) {
			return;
		}
		setBusy(true);
		setFailed(false);
		try {
			onDone(await cropImage(file, area));
		} catch {
			setFailed(true);
		} finally {
			setBusy(false);
		}
	};
	return { url, area, setArea, busy, failed, setFailed, confirm };
}

export function ImageCropDialog(props: Props) {
	const t = useTranslation();
	const state = useCropDialog(props);
	return (
		<ResponsiveDialog
			onlyDialog
			open
			dismissible={!state.busy}
			onOpenChange={(open) => !open && props.onDone()}
		>
			<ResponsiveDialogContent className="flex flex-col gap-4 p-6 sm:max-w-xl">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>{t("field.upload.cropTitle")}</ResponsiveDialogTitle>
				</ResponsiveDialogHeader>
				<p className="truncate text-sm">{props.file.name}</p>
				{state.url && (
					<ImageCropEditor
						url={state.url}
						aspectRatio={props.aspectRatio}
						onComplete={state.setArea}
						onError={() => state.setFailed(true)}
					/>
				)}
				{state.failed && (
					<p role="alert" className="text-sm text-destructive-text">
						{t("field.upload.cropError")}
					</p>
				)}
				<CropActions state={state} onCancel={() => props.onDone()} />
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}

function CropActions({
	state,
	onCancel,
}: {
	state: ReturnType<typeof useCropDialog>;
	onCancel: () => void;
}) {
	const t = useTranslation();
	return (
		<ResponsiveDialogFooter>
			<Button type="button" variant="outline" disabled={state.busy} onClick={onCancel}>
				{t("field.upload.cropCancel")}
			</Button>
			<Button type="button" disabled={!state.area || state.busy} onClick={state.confirm}>
				{t("field.upload.cropConfirm")}
			</Button>
		</ResponsiveDialogFooter>
	);
}
