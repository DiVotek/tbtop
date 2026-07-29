export interface FieldFormProps<P = unknown, TOptions = Record<string, unknown>> {
	id?: string;
	name: string;
	value: P | null;
	onChange: (next: P | null) => void;
	onBlur?: () => void;
	disabled?: boolean;
	/** Spread onto the control as `aria-invalid` — the shared primitives style their
	 * error state off it, otherwise the message shows but the control looks valid. */
	invalid?: boolean;
	options?: TOptions;
}

export interface FieldCellProps<P = unknown, TOptions = Record<string, unknown>> {
	value: P | null;
	options?: TOptions;
}

/** Stable DOM id for a field input: explicit id wins, else the field name. */
export function fieldId(props: { id?: string; name: string }): string {
	return props.id ?? props.name;
}

/** Coerce a controlled value to a string, treating non-strings as empty. */
export function asString(value: unknown): string {
	return typeof value === "string" ? value : "";
}
