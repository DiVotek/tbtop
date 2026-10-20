import { cn } from "../lib/cn";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { nullableCell } from "./cellHelpers";
import { type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";
import { OptionRow } from "./optionList";
import { coerceSelectValue } from "./selectShared";

interface RadioOption {
	value: string;
	label: string;
	description?: string;
	disabled?: boolean;
}

interface RadioOptionsBag {
	options?: RadioOption[];
	inline?: boolean;
}

export function RadioCell({ value, options }: FieldCellProps<string, RadioOptionsBag>) {
	return nullableCell(value, (v) => {
		const key = String(v);
		const match = options?.options?.find((o) => o.value === key);
		return <span>{match?.label ?? key}</span>;
	});
}

export function RadioForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	options,
}: FieldFormProps<string, RadioOptionsBag>) {
	const choices = options?.options ?? [];
	const groupId = fieldId({ id, name });
	// Records carry int-backed values (2) while wire options are string-cast ("2").
	const coerced = coerceSelectValue(value);
	return (
		<RadioGroup
			id={groupId}
			value={typeof coerced === "string" ? coerced : ""}
			onValueChange={(next) => onChange(next === "" ? null : next)}
			onBlur={onBlur}
			disabled={disabled}
			className={cn(options?.inline && "flex flex-row flex-wrap gap-4")}
			data-testid={`radio-${name}`}
		>
			{choices.map((opt) => (
				<OptionRow
					key={opt.value}
					groupId={groupId}
					value={opt.value}
					label={opt.label}
					description={opt.description}
					disabled={disabled || opt.disabled}
					control={(itemId) => (
						<RadioGroupItem id={itemId} value={opt.value} disabled={opt.disabled} />
					)}
				/>
			))}
		</RadioGroup>
	);
}
