import { arrayMove } from "@dnd-kit/sortable";

export function reorderMediaIds(ids: string[], activeId: string, overId: string): string[] {
	const oldIndex = ids.indexOf(activeId);
	const newIndex = ids.indexOf(overId);
	if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
		return ids;
	}
	return arrayMove(ids, oldIndex, newIndex);
}
