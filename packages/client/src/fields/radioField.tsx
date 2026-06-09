import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";

interface RadioOption {
	value: string;
	label: string;
}

interface RadioOptionsBag {
	options?: RadioOption[];
}

export function RadioCell({ value, options }: FieldCellProps<string, RadioOptionsBag>) {
	if (value === null || value === undefined) {
		return null;
	}
	const match = options?.options?.find((o) => o.value === value);
	return <span>{match?.label ?? value}</span>;
}

export function RadioForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	options,
}: FieldFormProps<string, RadioOptionsBag>) {
	const choices = options?.options ?? [];
	const groupId = id ?? name;
	return (
		<RadioGroup
			id={groupId}
			value={typeof value === "string" ? value : ""}
			onValueChange={(next) => onChange(next === "" ? null : next)}
			onBlur={onBlur}
			data-testid={`radio-${name}`}
		>
			{choices.map((opt) => {
				const itemId = `${groupId}-${opt.value}`;
				return (
					<div key={opt.value} className="flex items-center gap-2">
						<RadioGroupItem id={itemId} value={opt.value} />
						<Label htmlFor={itemId}>{opt.label}</Label>
					</div>
				);
			})}
		</RadioGroup>
	);
}
