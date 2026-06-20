import { Textarea } from "../ui/textarea";
import { nullableCell, TruncatedTextCell } from "./cellHelpers";
import { asString, type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";

interface TextareaOptionsBag {
	placeholder?: string;
	rows?: number;
	autoresize?: boolean;
}

export function TextareaCell({ value }: FieldCellProps<string>) {
	return nullableCell(value, (v) => <TruncatedTextCell value={String(v)} />);
}

export function TextareaForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	options,
}: FieldFormProps<string, TextareaOptionsBag>) {
	const className = options?.autoresize ? undefined : "field-sizing-fixed";
	return (
		<Textarea
			id={fieldId({ id, name })}
			name={name}
			rows={options?.rows}
			placeholder={options?.placeholder}
			className={className}
			value={asString(value)}
			onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
			onBlur={onBlur}
			disabled={disabled}
		/>
	);
}
