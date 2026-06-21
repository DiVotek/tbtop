import { Slider } from "../ui/slider";
import { nullableCell } from "./cellHelpers";
import { type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";

interface SliderBag {
	min?: number;
	max?: number;
	step?: number;
}

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 100;

export function SliderCell({ value }: FieldCellProps<number, SliderBag>) {
	return nullableCell(value, (v) => <span>{String(v)}</span>);
}

export function SliderForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	options,
}: FieldFormProps<number, SliderBag>) {
	const min = options?.min ?? DEFAULT_MIN;
	const max = options?.max ?? DEFAULT_MAX;
	const current = typeof value === "number" ? value : min;
	return (
		<div className="flex items-center gap-3" data-field={name} onBlur={onBlur}>
			<Slider
				id={fieldId({ id, name })}
				value={[current]}
				min={min}
				max={max}
				step={options?.step}
				disabled={disabled}
				onValueChange={([next]) => onChange(next ?? null)}
				aria-label={name}
			/>
			<output className="w-10 text-right text-sm tabular-nums">{current}</output>
		</div>
	);
}
