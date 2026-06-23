import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useCallback, useMemo, useRef, useState } from "react";
import { useClient } from "../data/client";
import type { UploadRow } from "../data/upload";
import { useTranslation } from "../i18n/i18n";
import type { UploadTask, UploadTaskStatus } from "../media/types";
import { UploadProgressList } from "../media/uploadProgressList";
import { useClientActionContext } from "../structure/actionContext";
import type { FieldFormProps } from "./fieldProps";
import {
	exceedsMaxSize,
	type MultiFormValue,
	runUpload,
	type UploadOptionsBag,
	UploadPicker,
	type UploadValue,
} from "./uploadField";
import { UploadSortableItem, UploadStaticItem } from "./uploadSortableItem";

function toItem(value: UploadValue | string): UploadValue {
	return typeof value === "string" ? { url: value, filename: value, path: value } : value;
}

function toArray(value: MultiFormValue | null): UploadValue[] {
	if (!value) {
		return [];
	}
	return (Array.isArray(value) ? value : [value]).map(toItem);
}

/** Emit value is the bare path of each item; a string item is already its path. */
function toPaths(items: UploadValue[]): string[] {
	return items.map((item) => item.path ?? item.url);
}

function itemId(item: UploadValue, index: number): string {
	return `${index}-${item.url || item.filename}`;
}

export function UploadMultiForm({
	id,
	name,
	value,
	onChange,
	disabled,
	options,
}: FieldFormProps<MultiFormValue, UploadOptionsBag>) {
	const t = useTranslation();
	const ctx = useClientActionContext();
	const client = useClient();
	const opts = useMemo(() => options ?? {}, [options]);

	const items = toArray(value);
	const canAddMore = !opts.maxFiles || items.length < opts.maxFiles;

	// Display holds the inflated objects; the ref accumulates them across an
	// async batch. Each onChange emits the derived path array, not the objects.
	const valueRef = useRef<UploadValue[]>(items);
	valueRef.current = items;

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

			const remaining = opts.maxFiles
				? opts.maxFiles - valueRef.current.length
				: files.length;
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

			for (let i = 0; i < batch.length; i++) {
				const file = batch[i];
				const task = newTasks[i];
				if (!file || !task) {
					continue;
				}

				if (exceedsMaxSize(opts, file)) {
					patchTask(setTasks, task.id, { status: "error" });
					setError(t("field.upload.tooLarge", "File exceeds the maximum size"));
					continue;
				}

				patchTask(setTasks, task.id, { status: "uploading", pct: 0 });
				try {
					const row: UploadRow = await runUpload({ opts, ctx, client, file, t });
					patchTask(setTasks, task.id, { status: "done", pct: 100 });
					const next = [...valueRef.current, { ...row }];
					valueRef.current = next;
					onChange(toPaths(next));
				} catch (err) {
					patchTask(setTasks, task.id, { status: "error" });
					setError(err instanceof Error ? err.message : String(err));
				}
			}
		},
		[opts, ctx, client, t, onChange],
	);

	const handleRemove = (index: number) => {
		const next = items.filter((_, i) => i !== index);
		onChange(next.length > 0 ? toPaths(next) : null);
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
		onChange(toPaths(arrayMove(items, oldIndex, newIndex)));
	};

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
	const sortableIds = items.map((item, i) => itemId(item, i));
	const reorderable = opts.reorderable === true;

	const itemList = items.map((item, i) => {
		const iid = itemId(item, i);
		const remove = () => handleRemove(i);
		return reorderable ? (
			<UploadSortableItem key={iid} item={item} itemId={iid} onRemove={remove} />
		) : (
			<UploadStaticItem key={iid} item={item} itemId={iid} onRemove={remove} />
		);
	});

	return (
		<div className="space-y-3">
			{items.length > 0 && reorderable ? (
				<DndContext
					sensors={sensors}
					onDragEnd={handleDragEnd}
					modifiers={[restrictToVerticalAxis, restrictToParentElement]}
				>
					<SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
						<div className="flex flex-col gap-2">{itemList}</div>
					</SortableContext>
				</DndContext>
			) : null}
			{items.length > 0 && !reorderable ? (
				<div className="flex flex-col gap-2">{itemList}</div>
			) : null}

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
