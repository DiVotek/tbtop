import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";
import { type LabeledOption, optionLabel } from "./optionLabel";
import { Chips } from "./tagsShared";

interface CheckboxListBag {
	options?: LabeledOption[];
}

const NOOP_REMOVE = () => {};

export function CheckboxListCell({ value, options }: FieldCellProps<string[], CheckboxListBag>) {
	if (!Array.isArray(value) || value.length === 0) {
		return null;
	}
	return (
		<div className="flex flex-wrap gap-1">
			<Chips
				name="checkboxlist-cell"
				value={value}
				onRemove={NOOP_REMOVE}
				labelFor={(v) => optionLabel(v, options?.options)}
				disabled
			/>
		</div>
	);
}

export function CheckboxListForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	options,
}: FieldFormProps<string[], CheckboxListBag>) {
	const choices = options?.options ?? [];
	const current = Array.isArray(value) ? value : [];
	const groupId = id ?? name;
	function toggle(v: string): void {
		const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
		onChange(next.length === 0 ? null : next);
	}
	return (
		<div className="grid gap-3" data-testid={`checkboxlist-${name}`} onBlur={onBlur}>
			{choices.map((opt) => {
				const itemId = `${groupId}-${opt.value}`;
				return (
					<div key={opt.value} className="flex items-center gap-2">
						<Checkbox
							id={itemId}
							checked={current.includes(opt.value)}
							disabled={disabled}
							onCheckedChange={() => toggle(opt.value)}
						/>
						<Label htmlFor={itemId}>{opt.label}</Label>
					</div>
				);
			})}
		</div>
	);
}
