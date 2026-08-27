import { Input } from "../ui/input";
import { nullableCell } from "./cellHelpers";
import { type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";
import { type AffixOptions, InputGroup } from "./inputGroup";

interface NumberOptions extends AffixOptions {
	placeholder?: string;
	step?: number | "any";
}

export function NumberCell({ value }: FieldCellProps<number>) {
	return nullableCell(value, (v) => <span>{String(v)}</span>);
}

export function NumberForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	invalid,
	describedBy,
	options,
}: FieldFormProps<number, NumberOptions>) {
	return (
		<InputGroup options={options} disabled={disabled} invalid={invalid}>
			<Input
				id={fieldId({ id, name })}
				name={name}
				type="number"
				defaultValue={typeof value === "number" ? String(value) : ""}
				onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
				onBlur={onBlur}
				disabled={disabled}
				aria-invalid={invalid || undefined}
				aria-describedby={describedBy}
				placeholder={options?.placeholder}
				step={options?.step}
			/>
		</InputGroup>
	);
}
