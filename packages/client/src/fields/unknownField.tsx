import { useRef, useState } from "react";
import { Input } from "../ui/input";
import { type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";

export function UnknownCell({ value }: FieldCellProps<unknown>) {
	return <code className="text-xs">{JSON.stringify(value)}</code>;
}

/** Strings are already the input's own output; stringify only structured values. */
function serializeUnknown(value: unknown): string {
	if (value === null || value === undefined) {
		return "";
	}
	if (typeof value === "string") {
		return value;
	}
	return JSON.stringify(value);
}

export function UnknownForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	invalid,
	describedBy,
}: FieldFormProps<unknown>) {
	const [draft, setDraft] = useState(() => serializeUnknown(value));
	const lastValueRef = useRef(value);

	// Identity, not JSON equality: a mid-edit string must not be re-serialized,
	// but an external object replacement still resets the display.
	if (value !== lastValueRef.current) {
		lastValueRef.current = value;
		setDraft(serializeUnknown(value));
	}

	return (
		<Input
			id={fieldId({ id, name })}
			name={name}
			value={draft}
			onChange={(e) => {
				const next = e.target.value;
				setDraft(next);
				onChange(next);
			}}
			onBlur={onBlur}
			disabled={disabled}
			aria-invalid={invalid || undefined}
			aria-describedby={describedBy}
		/>
	);
}
