import { Clock3Icon, XIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { nullableCell } from "./cellHelpers";
import { type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";

interface TimeOptions {
	label?: string;
	step?: number;
}

export function TimeCell({ value }: FieldCellProps<string>) {
	return nullableCell(value, (time) => <time dateTime={time}>{time.slice(0, 5)}</time>);
}

export function TimeForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	invalid,
	options,
}: FieldFormProps<string, TimeOptions>) {
	const time = toTimeString(value);
	const hour = time.slice(0, 2);
	const minute = time.slice(3, 5);
	const minutes = minuteSlots(options?.step, minute);
	const inputId = fieldId({ id, name });
	const accessibleName = options?.label ?? name;

	return (
		<div className="flex items-center gap-2">
			<input type="hidden" name={name} value={time} disabled={disabled} />
			<Clock3Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
			<Select
				value={hour}
				onValueChange={(nextHour) => onChange(`${nextHour}:${minute || minutes[0]}`)}
				disabled={disabled}
			>
				<SelectTrigger
					id={inputId}
					className="w-24"
					aria-label={`${accessibleName} hour`}
					aria-invalid={invalid || undefined}
					onBlur={onBlur}
				>
					<SelectValue placeholder="Hour" />
				</SelectTrigger>
				<SelectContent>
					{range(24).map((entry) => (
						<SelectItem key={entry} value={entry}>
							{entry}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<span className="text-muted-foreground" aria-hidden>
				:
			</span>
			<Select
				value={minute}
				onValueChange={(nextMinute) => onChange(`${hour || "00"}:${nextMinute}`)}
				disabled={disabled}
			>
				<SelectTrigger
					id={`${inputId}-minute`}
					className="w-24"
					aria-label={`${accessibleName} minute`}
					aria-invalid={invalid || undefined}
					onBlur={onBlur}
				>
					<SelectValue placeholder="Minute" />
				</SelectTrigger>
				<SelectContent>
					{minutes.map((entry) => (
						<SelectItem key={entry} value={entry}>
							{entry}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{time !== "" && (
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => onChange(null)}
					disabled={disabled}
					aria-label="Clear time"
				>
					<XIcon aria-hidden />
				</Button>
			)}
		</div>
	);
}

function minuteSlots(stepOption: number | undefined, current: string): string[] {
	const step =
		Number.isInteger(stepOption) && stepOption && stepOption > 0 && stepOption <= 60
			? stepOption
			: 1;
	const slots = range(Math.ceil(60 / step), step);
	if (/^(?:[0-5]\d)$/.test(current) && !slots.includes(current)) {
		slots.push(current);
		slots.sort();
	}
	return slots;
}

function range(length: number, step = 1): string[] {
	return Array.from({ length }, (_, index) => String(index * step).padStart(2, "0"));
}

function toTimeString(value: unknown): string {
	if (typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d/.test(value)) {
		return value.slice(0, 5);
	}
	if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
		return "";
	}
	return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}
