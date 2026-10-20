import { Checkbox } from "../ui/checkbox";
import { type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";
import { type LabeledOption, optionLabel } from "./optionLabel";
import { OptionRow } from "./optionList";
import { LabelChips } from "./tagsShared";

interface CheckboxListBag {
	options?: LabeledOption[];
}

/** Records carry int-backed values ([1, 2]) while wire options are string-cast ("1"). */
function selectedValues(value: unknown): string[] {
	return Array.isArray(value) ? value.map(String) : [];
}

export function CheckboxListCell({ value, options }: FieldCellProps<string[], CheckboxListBag>) {
	const current = selectedValues(value);
	if (current.length === 0) {
		return null;
	}
	return <LabelChips value={current} labelFor={(v) => optionLabel(v, options?.options)} />;
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
	const current = selectedValues(value);
	const groupId = fieldId({ id, name });
	function toggle(v: string): void {
		const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
		onChange(next.length === 0 ? null : next);
	}
	return (
		<div className="grid gap-3" data-testid={`checkboxlist-${name}`} onBlur={onBlur}>
			{choices.map((opt) => (
				<OptionRow
					key={opt.value}
					groupId={groupId}
					value={opt.value}
					label={opt.label}
					control={(itemId) => (
						<Checkbox
							id={itemId}
							checked={current.includes(opt.value)}
							disabled={disabled}
							onCheckedChange={() => toggle(opt.value)}
						/>
					)}
				/>
			))}
		</div>
	);
}
