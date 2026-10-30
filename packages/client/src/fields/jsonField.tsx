import { Textarea } from "../ui/textarea";
import { nullableCell } from "./cellHelpers";
import { type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";

export function JsonCell({ value }: FieldCellProps<unknown>) {
	return nullableCell(value, (v) => <code className="text-xs">{JSON.stringify(v)}</code>);
}

export function JsonForm({
	id,
	name,
	value,
	onChange,
	invalid,
	describedBy,
}: FieldFormProps<unknown>) {
	return (
		<Textarea
			id={fieldId({ id, name })}
			name={name}
			aria-invalid={invalid || undefined}
			aria-describedby={describedBy}
			defaultValue={
				value === null || value === undefined ? "" : JSON.stringify(value, null, 2)
			}
			onChange={(e) => {
				try {
					onChange(e.target.value === "" ? null : JSON.parse(e.target.value));
				} catch {
					onChange(e.target.value);
				}
			}}
		/>
	);
}
