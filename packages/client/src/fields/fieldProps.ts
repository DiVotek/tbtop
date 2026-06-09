export interface FieldFormProps<P = unknown, TOptions = Record<string, unknown>> {
	id?: string;
	name: string;
	value: P | null;
	onChange: (next: P | null) => void;
	onBlur?: () => void;
	options?: TOptions;
}

export interface FieldCellProps<P = unknown, TOptions = Record<string, unknown>> {
	value: P | null;
	options?: TOptions;
}
