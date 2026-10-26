import { Textarea } from "../ui/textarea";
import { nullableCell, TruncatedTextCell } from "./cellHelpers";
import { asString, type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";
import { useLocalePlaceholder } from "./localePlaceholder";

interface TextareaOptionsBag {
	/** A string, or one per content locale. */
	placeholder?: string | Record<string, string>;
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
	invalid,
	describedBy,
	options,
}: FieldFormProps<string, TextareaOptionsBag>) {
	const className = options?.autoresize ? undefined : "field-sizing-fixed";
	const placeholder = useLocalePlaceholder(options?.placeholder);
	return (
		<Textarea
			id={fieldId({ id, name })}
			name={name}
			rows={options?.rows}
			placeholder={placeholder}
			className={className}
			value={asString(value)}
			onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
			onBlur={onBlur}
			disabled={disabled}
			aria-invalid={invalid || undefined}
			aria-describedby={describedBy}
		/>
	);
}
