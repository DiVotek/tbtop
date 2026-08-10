import { Input } from "../ui/input";
import { nullableCell } from "./cellHelpers";
import { type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";

interface TimeOptions {
	seconds?: boolean;
	minuteStep?: number;
	secondStep?: number;
}

export function TimeCell({ value, options }: FieldCellProps<string, TimeOptions>) {
	return nullableCell(value, (time) => (
		<time dateTime={time}>{toTimeString(time, options?.seconds)}</time>
	));
}

export function TimeForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	invalid,
	describedBy,
	options,
}: FieldFormProps<string, TimeOptions>) {
	return (
		<Input
			id={fieldId({ id, name })}
			name={name}
			type="time"
			value={toTimeString(value, options?.seconds)}
			step={inputStep(options)}
			onChange={(event) => {
				const next = event.currentTarget.value;
				onChange(next === "" ? null : formatTime(next, options?.seconds === true));
			}}
			onBlur={onBlur}
			disabled={disabled}
			aria-invalid={invalid || undefined}
			aria-describedby={describedBy}
			className="[&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
		/>
	);
}

function inputStep(options: TimeOptions | undefined): number {
	if (options?.seconds) {
		return validStep(options.secondStep, 59) ? options.secondStep : 1;
	}
	return (validStep(options?.minuteStep, 60) ? options.minuteStep : 1) * 60;
}

function validStep(value: number | undefined, maximum: number): value is number {
	return Number.isInteger(value) && value !== undefined && value >= 1 && value <= maximum;
}

function toTimeString(value: unknown, hasSeconds = false): string {
	if (typeof value === "string") {
		const match = value.match(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?/);
		if (match) {
			return formatTime(match[0], hasSeconds);
		}
	}
	const date = value instanceof Date ? value : new Date(typeof value === "string" ? value : "");
	if (Number.isNaN(date.getTime())) {
		return "";
	}
	const time = [date.getHours(), date.getMinutes(), date.getSeconds()]
		.map((part) => String(part).padStart(2, "0"))
		.join(":");
	return formatTime(time, hasSeconds);
}

function formatTime(time: string, hasSeconds: boolean): string {
	if (!hasSeconds) {
		return time.slice(0, 5);
	}
	return time.length >= 8 ? time.slice(0, 8) : `${time.slice(0, 5)}:00`;
}
