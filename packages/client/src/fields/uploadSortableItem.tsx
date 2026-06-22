import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, XIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { useTranslation } from "../i18n/i18n";
import { Button } from "../ui/button";
import { looksLikeImage, type UploadValue } from "./uploadField";

interface SortableItemProps {
	item: UploadValue;
	itemId: string;
	onRemove: () => void;
	reorderable: boolean;
}

export function UploadSortableItem({ item, itemId, onRemove, reorderable }: SortableItemProps) {
	const t = useTranslation();
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: itemId,
	});

	const style: CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : undefined,
	};

	const isImg = looksLikeImage(item.url, item.filename);

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="flex items-center gap-3 rounded-md border p-2"
			data-testid={`upload-item-${itemId}`}
		>
			{reorderable ? (
				<button
					type="button"
					className="flex cursor-grab touch-none items-center text-muted-foreground active:cursor-grabbing"
					aria-label={t("field.upload.reorder", "Reorder")}
					data-testid={`upload-drag-handle-${itemId}`}
					{...attributes}
					{...listeners}
				>
					<GripVertical className="size-4" />
				</button>
			) : null}
			{isImg ? (
				<img
					src={item.url}
					alt={item.filename}
					className="h-10 w-10 rounded object-cover"
				/>
			) : (
				<div className="h-10 w-10 rounded bg-muted" />
			)}
			<span className="flex-1 truncate text-sm">{item.filename}</span>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				aria-label={t("field.upload.remove", "Remove")}
				onClick={onRemove}
			>
				<XIcon className="h-4 w-4" />
			</Button>
		</div>
	);
}
