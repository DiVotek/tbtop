import { applyMask } from "../lib/mask";
import type { CopyableConfig } from "../structure/copyable";
import { CopyButton } from "../ui/copyButton";
import { Input } from "../ui/input";
import { nullableCell, TruncatedTextCell } from "./cellHelpers";
import { asString, type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";
import { MaskedInput } from "./maskedInput";

interface TextOptions {
	mask?: string;
	copyable?: CopyableConfig;
	placeholder?: string;
}

export function TextCell({ value }: FieldCellProps<string>) {
	return nullableCell(value, (v) => <TruncatedTextCell value={String(v)} />);
}

export function TextForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	options,
}: FieldFormProps<string, TextOptions>) {
	const inputId = fieldId({ id, name });
	const mask = options?.mask;
	const copyable = options?.copyable;
	const placeholder = options?.placeholder;
	const inputClass = copyable ? "pr-9" : undefined;
	const display = mask ? applyMask(asString(value), mask) : asString(value);

	const input = mask ? (
		<MaskedInput
			id={inputId}
			name={name}
			mask={mask}
			value={asString(value)}
			onChange={onChange}
			onBlur={onBlur}
			disabled={disabled}
			className={inputClass}
			placeholder={placeholder}
		/>
	) : (
		<Input
			id={inputId}
			name={name}
			value={asString(value)}
			onChange={(e) => onChange(e.target.value)}
			onBlur={onBlur}
			disabled={disabled}
			className={inputClass}
			placeholder={placeholder}
		/>
	);

	if (!copyable) {
		return input;
	}
	return (
		<div className="relative">
			{input}
			<CopyButton
				value={display}
				copyable={copyable}
				className="absolute right-2 top-1/2 -translate-y-1/2"
			/>
		</div>
	);
}
