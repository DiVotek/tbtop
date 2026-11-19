import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { UploadSortableItem, UploadStaticItem } from "./uploadSortableItem";
import type { UploadValue } from "./uploadUtils";

interface Props {
	items: UploadValue[];
	disabled?: boolean;
	reorderable?: boolean;
	onChange: (value: UploadValue[] | null) => void;
}

function itemId(item: UploadValue, index: number): string {
	return `${index}-${item.path || item.url}`;
}

function useUploadOrder({ items, disabled, onChange }: Props) {
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
	const onDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (disabled || !over || active.id === over.id) {
			return;
		}
		const oldIndex = items.findIndex((item, i) => itemId(item, i) === active.id);
		const newIndex = items.findIndex((item, i) => itemId(item, i) === over.id);
		if (oldIndex === -1 || newIndex === -1) {
			return;
		}
		onChange(arrayMove(items, oldIndex, newIndex));
	};
	return { sensors, onDragEnd };
}

function UploadItems({ items, disabled, reorderable, onChange }: Props) {
	return items.map((item, i) => {
		const iid = itemId(item, i);
		const onRemove = () => {
			if (disabled) {
				return;
			}
			const next = items.filter((_, index) => index !== i);
			onChange(next.length > 0 ? next : null);
		};
		const Item = reorderable ? UploadSortableItem : UploadStaticItem;
		return <Item key={iid} item={item} itemId={iid} disabled={disabled} onRemove={onRemove} />;
	});
}

export function UploadMultiItems(props: Props) {
	const order = useUploadOrder(props);
	if (props.items.length === 0) {
		return null;
	}
	const content = (
		<div className="flex flex-col gap-2">
			<UploadItems {...props} />
		</div>
	);
	if (!props.reorderable) {
		return content;
	}
	return (
		<DndContext {...order} modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
			<SortableContext items={props.items.map(itemId)} strategy={verticalListSortingStrategy}>
				{content}
			</SortableContext>
		</DndContext>
	);
}
