import { Textarea } from "../ui/textarea";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";

interface TextareaOptionsBag {
	placeholder?: string;
	rows?: number;
	autoresize?: boolean;
}

export function TextareaCell({ value }: FieldCellProps<string>) {
	if (value === null || value === undefined) {
		return null;
	}
	const str = String(value);
	return <span title={str}>{str.length > 80 ? `${str.slice(0, 80)}…` : str}</span>;
}

export function TextareaForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	options,
}: FieldFormProps<string, TextareaOptionsBag>) {
	const className = options?.autoresize ? undefined : "field-sizing-fixed";
	return (
		<Textarea
			id={id ?? name}
			name={name}
			rows={options?.rows}
			placeholder={options?.placeholder}
			className={className}
			value={typeof value === "string" ? value : ""}
			onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
			onBlur={onBlur}
		/>
	);
}
