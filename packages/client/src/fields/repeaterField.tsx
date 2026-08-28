import { useRef } from "react";
import { useTranslation } from "../i18n/i18n";
import { safeUuid } from "../lib/safeUuid";
import type { StructureNode } from "../structure/structure";
import { Button } from "../ui/button";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";
import { addItem, moveItem, removeAt, removeItem, swapAt } from "./repeaterItems";
import { RepeaterRow } from "./repeaterRow";

type Item = Record<string, unknown>;

interface RepeaterOptions {
	fields?: StructureNode[];
	minItems?: number;
	maxItems?: number;
	defaultItems?: number;
	collapsible?: boolean;
	summary?: string;
}

export function RepeaterCell({ value }: FieldCellProps<Item[]>) {
	const t = useTranslation();
	if (!value || value.length === 0) {
		return null;
	}
	const label =
		value.length === 1
			? t("field.repeater.item_singular")
			: t("field.repeater.items").replace("{count}", String(value.length));
	return <span className="text-xs text-muted-foreground">{label}</span>;
}

export function RepeaterForm({
	name,
	value,
	onChange,
	disabled,
	options,
}: FieldFormProps<Item[], RepeaterOptions>) {
	const t = useTranslation();
	const subFields = options?.fields ?? [];
	const minItems = options?.minItems ?? 0;
	const maxItems = options?.maxItems;
	const defaultItems = options?.defaultItems ?? 0;
	const collapsible = options?.collapsible === true;
	const summaryField = options?.summary;
	const seeded: Item[] =
		defaultItems > 0 && !disabled ? Array.from({ length: defaultItems }, () => ({})) : [];
	const items: Item[] = value !== undefined && value !== null ? value : seeded;
	const { keys, initialIndexOf } = useStableItemKeys(items);

	function emit(next: Item[], keyMutation: (k: string[]) => string[]): void {
		keys.current = keyMutation(keys.current);
		onChange(next);
	}

	return (
		<div data-field={name} className="flex flex-col gap-2">
			{items.map((item, index) => (
				<RepeaterRow
					key={keys.current[index]}
					repeaterName={name}
					item={item}
					index={index}
					initialIndex={initialIndexOf(keys.current[index])}
					itemCount={items.length}
					subFields={subFields}
					minItems={minItems}
					disabled={disabled}
					collapsible={collapsible}
					summaryField={summaryField}
					onSubFieldChange={(subName, next) => {
						const nextItems = items.map((it, i) =>
							i === index ? { ...it, [subName]: next } : it,
						);
						emit(nextItems, (k) => k);
					}}
					onRemove={() => emit(removeItem(items, index), (k) => removeAt(k, index))}
					onMoveUp={() =>
						emit(moveItem(items, index, "up"), (k) => swapAt(k, index, index - 1))
					}
					onMoveDown={() =>
						emit(moveItem(items, index, "down"), (k) => swapAt(k, index, index + 1))
					}
				/>
			))}
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={disabled || (maxItems !== undefined && items.length >= maxItems)}
				onClick={() => emit(addItem(items, subFields), (k) => [...k, safeUuid()])}
				className="self-start"
			>
				{t("field.repeater.add_item")}
			</Button>
		</div>
	);
}

/**
 * Assigns each row a stable UUID key that follows it through reorders
 * (moveUp/moveDown swap the key alongside the item), and records the index
 * each key had when first assigned. That original index is how a row's
 * `initial` value is found after a reorder: `initial` is captured once at
 * mount and stays keyed by position, so only a row's own original position —
 * not its current one — can look it up correctly. A row added afterward
 * (via "Add item") gets no entry: it has no `initial` counterpart at all.
 */
function useStableItemKeys(items: Item[]): {
	keys: { current: string[] };
	initialIndexOf: (key: string | undefined) => number | undefined;
} {
	const keysRef = useRef<string[]>([]);
	const originalIndexRef = useRef<Map<string, number>>(new Map());
	if (keysRef.current.length !== items.length) {
		const next = keysRef.current.slice(0, items.length);
		while (next.length < items.length) {
			const key = safeUuid();
			originalIndexRef.current.set(key, next.length);
			next.push(key);
		}
		keysRef.current = next;
	}
	return {
		keys: keysRef,
		initialIndexOf: (key) =>
			key !== undefined ? originalIndexRef.current.get(key) : undefined,
	};
}
