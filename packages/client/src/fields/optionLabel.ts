export interface LabeledOption {
	value: string;
	label: string;
}

/** Resolve an option's label by value, falling back to the raw value. */
export function optionLabel(value: string, options: LabeledOption[] | undefined): string {
	return options?.find((o) => o.value === value)?.label ?? value;
}
