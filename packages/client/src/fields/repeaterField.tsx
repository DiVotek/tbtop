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
	const items: Item[] = value ?? [];
	const keys = useStableItemKeys(items);

	function emit(next: Item[], keyMutation: (k: string[]) => string[]): void {
		keys.current = keyMutation(keys.current);
		onChange(next);
	}

	return (
		<div data-field={name} className="flex flex-col gap-2">
			{items.map((item, index) => (
				<RepeaterRow
					key={keys.current[index]}
					item={item}
					index={index}
					itemCount={items.length}
					subFields={subFields}
					minItems={minItems}
					disabled={disabled}
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

function useStableItemKeys(items: Item[]): { current: string[] } {
	const ref = useRef<string[]>([]);
	if (ref.current.length !== items.length) {
		const next = ref.current.slice(0, items.length);
		while (next.length < items.length) {
			next.push(safeUuid());
		}
		ref.current = next;
	}
	return ref;
}
