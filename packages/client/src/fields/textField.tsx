import { Input } from "../ui/input";
import { nullableCell, TruncatedTextCell } from "./cellHelpers";
import { asString, type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";

export function TextCell({ value }: FieldCellProps<string>) {
	return nullableCell(value, (v) => <TruncatedTextCell value={String(v)} />);
}

export function TextForm({ id, name, value, onChange, onBlur, disabled }: FieldFormProps<string>) {
	return (
		<Input
			id={fieldId({ id, name })}
			name={name}
			value={asString(value)}
			onChange={(e) => onChange(e.target.value)}
			onBlur={onBlur}
			disabled={disabled}
		/>
	);
}
