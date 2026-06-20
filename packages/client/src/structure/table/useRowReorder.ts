/**
 * Drag-reorder orchestration for TableGrid: optimistic local ordering, dnd-kit
 * sensors, and the onDragEnd flow (optimistic → POST → onRefresh, or rollback +
 * notify on reject). The order math lives in reorder.ts; this hook owns state.
 */
import {
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useEffect, useRef, useState } from "react";
import { useClientActionContext } from "../actionContext";
import { readId } from "./normalize";
import { computeReorder } from "./reorder";

type Row = Record<string, unknown>;

interface UseRowReorderInput {
	rows: Row[];
	enabled: boolean;
	onRefresh?: () => void;
	reorderRows?: (ids: string[]) => Promise<unknown>;
}

interface RowReorder {
	rows: Row[];
	ids: string[];
	sensors: ReturnType<typeof useSensors>;
	onDragEnd: (event: DragEndEvent) => void;
}

export function useRowReorder(input: UseRowReorderInput): RowReorder {
	const ctx = useClientActionContext();
	const [rows, setRows] = useState<Row[]>(input.rows);
	// Server rows win whenever they change (refetch); local order is transient.
	const serverRows = input.rows;
	const lastServer = useRef(serverRows);
	useEffect(() => {
		if (lastServer.current !== serverRows) {
			lastServer.current = serverRows;
			setRows(serverRows);
		}
	}, [serverRows]);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	function onDragEnd(event: DragEndEvent): void {
		const { active, over } = event;
		if (!over || active.id === over.id) {
			return;
		}
		const current = rows;
		const ids = rowIds(current);
		const next = computeReorder(ids, String(active.id), String(over.id));
		setRows(applyOrder(current, next));
		void persist(next, current);
	}

	async function persist(nextIds: string[], snapshot: Row[]): Promise<void> {
		if (!input.reorderRows) {
			return;
		}
		try {
			await input.reorderRows(nextIds);
			input.onRefresh?.();
		} catch {
			setRows(snapshot);
			ctx.notify({ kind: "error", message: ctx.t("table.reorder_failed") });
		}
	}

	return { rows, ids: rowIds(rows), sensors, onDragEnd };
}

function rowIds(rows: Row[]): string[] {
	return rows.map((r) => readId(r)).filter((id): id is string => !!id);
}

function applyOrder(rows: Row[], orderedIds: string[]): Row[] {
	const byId = new Map(rows.map((r) => [readId(r), r] as const));
	return orderedIds.map((id) => byId.get(id)).filter((r): r is Row => r !== undefined);
}
