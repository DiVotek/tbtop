import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, XIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { useTranslation } from "../i18n/i18n";
import { Button } from "../ui/button";
import { basename, looksLikeImage, type UploadValue } from "./uploadUtils";

interface ItemContentProps {
	item: UploadValue;
	disabled?: boolean;
	onRemove: () => void;
}

interface ItemProps extends ItemContentProps {
	itemId: string;
}

function ItemContent({ item, disabled, onRemove }: ItemContentProps) {
	const t = useTranslation();
	const filename = basename(item.path);
	const isImg = item.url !== "" && looksLikeImage(item.url, item.path);

	return (
		<>
			{isImg ? (
				<img src={item.url} alt={filename} className="h-10 w-10 rounded object-cover" />
			) : (
				<div className="h-10 w-10 rounded bg-muted" />
			)}
			<span className="flex-1 truncate text-sm">{filename}</span>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				aria-label={t("field.upload.remove", "Remove")}
				disabled={disabled}
				onClick={onRemove}
			>
				<XIcon className="h-4 w-4" />
			</Button>
		</>
	);
}

export function UploadStaticItem(props: ItemProps) {
	return (
		<div
			className="flex items-center gap-3 rounded-md border p-2"
			data-testid={`upload-item-${props.itemId}`}
		>
			<ItemContent {...props} />
		</div>
	);
}

export function UploadSortableItem(props: ItemProps) {
	const t = useTranslation();
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: props.itemId,
		disabled: props.disabled,
	});

	const style: CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : undefined,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="flex items-center gap-3 rounded-md border p-2"
			data-testid={`upload-item-${props.itemId}`}
		>
			<button
				type="button"
				className="flex cursor-grab touch-none items-center text-muted-foreground active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50"
				aria-label={t("field.upload.reorder", "Reorder")}
				data-testid={`upload-drag-handle-${props.itemId}`}
				disabled={props.disabled}
				{...attributes}
				{...listeners}
			>
				<GripVertical className="size-4" />
			</button>
			<ItemContent {...props} />
		</div>
	);
}
