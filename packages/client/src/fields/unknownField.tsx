import { Input } from "../ui/input";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";

export function UnknownCell({ value }: FieldCellProps<unknown>) {
	return <code className="text-xs">{JSON.stringify(value)}</code>;
}

export function UnknownForm({ id, name, value, onChange }: FieldFormProps<unknown>) {
	return (
		<Input
			id={id ?? name}
			name={name}
			defaultValue={value === null || value === undefined ? "" : JSON.stringify(value)}
			onChange={(e) => onChange(e.target.value)}
		/>
	);
}
