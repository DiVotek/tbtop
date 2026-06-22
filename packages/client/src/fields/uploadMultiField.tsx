import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useCallback, useMemo, useState } from "react";
import { useClient } from "../data/client";
import type { UploadRow } from "../data/upload";
import { useTranslation } from "../i18n/i18n";
import type { UploadTask, UploadTaskStatus } from "../media/types";
import { UploadProgressList } from "../media/uploadProgressList";
import { useClientActionContext } from "../structure/actionContext";
import type { FieldFormProps } from "./fieldProps";
import {
	exceedsMaxSize,
	runUpload,
	type UploadOptionsBag,
	UploadPicker,
	type UploadValue,
} from "./uploadField";
import { UploadSortableItem } from "./uploadSortableItem";

function toArray(value: UploadValue | UploadValue[] | null): UploadValue[] {
	if (!value) {
		return [];
	}
	return Array.isArray(value) ? value : [value];
}

function itemId(item: UploadValue, index: number): string {
	return item.url || `pending-${index}`;
}

export function UploadMultiForm({
	id,
	name,
	value,
	onChange,
	disabled,
	options,
}: FieldFormProps<UploadValue | UploadValue[], UploadOptionsBag>) {
	const t = useTranslation();
	const ctx = useClientActionContext();
	const client = useClient();
	const opts = useMemo(() => options ?? {}, [options]);

	const items = toArray(value);
	const canAddMore = !opts.maxFiles || items.length < opts.maxFiles;

	const [tasks, setTasks] = useState<UploadTask[]>([]);
	const [error, setError] = useState<string | null>(null);
	const uploading = tasks.some(
		(task) => task.status === "uploading" || task.status === "pending",
	);

	const uploadFiles = useCallback(
		async (files: FileList | null) => {
			if (!files || files.length === 0) {
				return;
			}
			setError(null);

			const remaining = opts.maxFiles ? opts.maxFiles - toArray(value).length : files.length;
			const batch = Array.from(files).slice(0, Math.max(0, remaining));
			if (batch.length === 0) {
				return;
			}

			const stamp = Date.now();
			const newTasks: UploadTask[] = batch.map((file, i) => ({
				id: `${stamp}-${i}-${file.name}`,
				name: file.name,
				status: "pending" as UploadTaskStatus,
				pct: 0,
			}));
			setTasks((prev) => [...prev, ...newTasks]);

			let current = toArray(value);
			for (let i = 0; i < batch.length; i++) {
				const file = batch[i];
				const task = newTasks[i];
				if (!file || !task) {
					continue;
				}

				if (exceedsMaxSize(opts, file)) {
					patchTask(setTasks, task.id, { status: "error" });
					continue;
				}

				patchTask(setTasks, task.id, { status: "uploading", pct: 0 });
				try {
					const row: UploadRow = await runUpload({ opts, ctx, client, file, t });
					patchTask(setTasks, task.id, { status: "done", pct: 100 });
					current = [...current, { filename: row.filename, url: row.url }];
					onChange(current);
				} catch (err) {
					patchTask(setTasks, task.id, { status: "error" });
					setError(err instanceof Error ? err.message : String(err));
				}
			}
		},
		[opts, value, ctx, client, t, onChange],
	);

	const handleRemove = (index: number) => {
		const next = items.filter((_, i) => i !== index);
		onChange(next.length > 0 ? next : null);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) {
			return;
		}
		const oldIndex = items.findIndex((item, i) => itemId(item, i) === active.id);
		const newIndex = items.findIndex((item, i) => itemId(item, i) === over.id);
		if (oldIndex === -1 || newIndex === -1) {
			return;
		}
		onChange(arrayMove(items, oldIndex, newIndex));
	};

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
	const sortableIds = items.map((item, i) => itemId(item, i));
	const reorderable = opts.reorderable === true;

	const list = (
		<div className="flex flex-col gap-2">
			{items.map((item, i) => (
				<UploadSortableItem
					key={itemId(item, i)}
					item={item}
					itemId={itemId(item, i)}
					onRemove={() => handleRemove(i)}
					reorderable={reorderable}
				/>
			))}
		</div>
	);

	return (
		<div className="space-y-3">
			{items.length > 0 && reorderable ? (
				<DndContext
					sensors={sensors}
					onDragEnd={handleDragEnd}
					modifiers={[restrictToVerticalAxis, restrictToParentElement]}
				>
					<SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
						{list}
					</SortableContext>
				</DndContext>
			) : null}
			{items.length > 0 && !reorderable ? list : null}

			<UploadProgressList tasks={tasks.filter((task) => task.status !== "done")} />

			{canAddMore ? (
				<UploadPicker
					id={id ?? name}
					name={name}
					accept={opts.accept}
					multiple
					busy={uploading}
					disabled={disabled}
					error={error}
					onFiles={uploadFiles}
				/>
			) : null}
		</div>
	);
}

type SetTasks = React.Dispatch<React.SetStateAction<UploadTask[]>>;

function patchTask(setTasks: SetTasks, id: string, patch: Partial<UploadTask>): void {
	setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...patch } : task)));
}
