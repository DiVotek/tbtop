import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, XIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "../i18n/i18n";
import { Button } from "../ui/button";
import { MediaThumb } from "./mediaThumb";
import type { MediaItem } from "./types";

interface MediaPreviewChipProps {
	item: MediaItem;
	onRemove: () => void;
	disabled?: boolean;
}

export function MediaPreviewChip(props: MediaPreviewChipProps): ReactNode {
	return <ChipContent {...props} />;
}

export function SortableMediaPreviewChip(props: MediaPreviewChipProps): ReactNode {
	const t = useTranslation();
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: props.item.id,
		disabled: props.disabled,
	});
	const style: CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : undefined,
	};

	return (
		<ChipContent
			{...props}
			containerRef={setNodeRef}
			style={style}
			dragHandle={
				<button
					type="button"
					className="flex cursor-grab touch-none items-center text-muted-foreground active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50"
					aria-label={t("field.upload.reorder")}
					data-testid={`media-preview-drag-handle-${props.item.id}`}
					disabled={props.disabled}
					{...attributes}
					{...listeners}
				>
					<GripVertical className="size-4" />
				</button>
			}
		/>
	);
}

function ChipContent({
	item,
	onRemove,
	disabled,
	containerRef,
	style,
	dragHandle,
}: MediaPreviewChipProps & {
	containerRef?: (node: HTMLElement | null) => void;
	style?: CSSProperties;
	dragHandle?: ReactNode;
}): ReactNode {
	const t = useTranslation();
	return (
		<div
			ref={containerRef}
			style={style}
			className="group relative flex items-center gap-2 rounded-md border bg-card p-1.5"
			data-testid={`media-preview-${item.id}`}
		>
			{dragHandle}
			<div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded bg-muted">
				<MediaThumb item={item} size="sm" />
			</div>
			<span className="max-w-[120px] truncate text-xs">{item.name}</span>
			{!disabled && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-5 w-5 p-0"
					onClick={onRemove}
					aria-label={t("field.select.remove").replace("{label}", item.name)}
					data-testid={`media-preview-remove-${item.id}`}
				>
					<XIcon className="h-3 w-3" />
				</Button>
			)}
		</div>
	);
}
