import { Textarea } from "../ui/textarea";
import { nullableCell } from "./cellHelpers";
import { type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";

export function JsonCell({ value }: FieldCellProps<unknown>) {
	return nullableCell(value, (v) => <code className="text-xs">{JSON.stringify(v)}</code>);
}

export function JsonForm({ id, name, value, onChange }: FieldFormProps<unknown>) {
	return (
		<Textarea
			id={fieldId({ id, name })}
			name={name}
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
