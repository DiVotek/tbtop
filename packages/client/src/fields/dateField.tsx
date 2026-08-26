import { Input } from "../ui/input";
import { nullableCell } from "./cellHelpers";
import { type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";

export { DateForm } from "./dateForm";

export function DateCell({ value }: FieldCellProps<string>) {
	return nullableCell(value, (v) => {
		const date = new Date(String(v));
		if (Number.isNaN(date.getTime())) {
			return <span>{String(v)}</span>;
		}
		return <time dateTime={date.toISOString()}>{date.toLocaleDateString()}</time>;
	});
}

export function DateTimeCell({ value }: FieldCellProps<string>) {
	return nullableCell(value, (v) => {
		const date = new Date(String(v));
		if (Number.isNaN(date.getTime())) {
			return <span>{String(v)}</span>;
		}
		return <time dateTime={date.toISOString()}>{date.toLocaleString()}</time>;
	});
}

export function DateTimeForm({ id, name, value, onChange, disabled }: FieldFormProps<string>) {
	const local = toLocalDateTime(value);
	return (
		<Input
			id={fieldId({ id, name })}
			name={name}
			type="datetime-local"
			defaultValue={local}
			onChange={(e) => onChange(localToIso(e.target.value))}
			disabled={disabled}
		/>
	);
}

function toLocalDateTime(value: unknown): string {
	const date = parseDate(value);
	if (!date) {
		return "";
	}
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localToIso(local: string): string | null {
	if (local === "") {
		return null;
	}
	const date = new Date(local);
	if (Number.isNaN(date.getTime())) {
		return null;
	}
	return date.toISOString();
}

function parseDate(value: unknown): Date | null {
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return value;
	}
	if (typeof value !== "string" || value === "") {
		return null;
	}
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}
