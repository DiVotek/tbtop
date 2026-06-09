import { Textarea } from "../ui/textarea";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";

export function JsonCell({ value }: FieldCellProps<unknown>) {
	if (value === null || value === undefined) {
		return null;
	}
	return <code className="text-xs">{JSON.stringify(value)}</code>;
}

export function JsonForm({ id, name, value, onChange }: FieldFormProps<unknown>) {
	return (
		<Textarea
			id={id ?? name}
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
