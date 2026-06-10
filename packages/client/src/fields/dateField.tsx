import { useEffect, useRef } from "react";
import { Input } from "../ui/input";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";

export function DateCell({ value }: FieldCellProps<string>) {
	if (value === null || value === undefined) {
		return null;
	}
	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) {
		return <span>{String(value)}</span>;
	}
	return <time dateTime={date.toISOString()}>{date.toLocaleDateString()}</time>;
}

export function DateTimeCell({ value }: FieldCellProps<string>) {
	if (value === null || value === undefined) {
		return null;
	}
	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) {
		return <span>{String(value)}</span>;
	}
	return <time dateTime={date.toISOString()}>{date.toLocaleString()}</time>;
}

export function DateForm({ id, name, value, onChange, disabled }: FieldFormProps<string>) {
	const isoDate = toIsoDate(value);
	useNormalizedInitial(value, isoDate || null, onChange);
	return (
		<Input
			id={id ?? name}
			name={name}
			type="date"
			defaultValue={isoDate}
			onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
			disabled={disabled}
		/>
	);
}

export function DateTimeForm({ id, name, value, onChange, disabled }: FieldFormProps<string>) {
	const local = toLocalDateTime(value);
	useNormalizedInitial(value, localToIso(local), onChange);
	return (
		<Input
			id={id ?? name}
			name={name}
			type="datetime-local"
			defaultValue={local}
			onChange={(e) => onChange(localToIso(e.target.value))}
			disabled={disabled}
		/>
	);
}

export function TimeForm({ id, name, value, onChange, disabled }: FieldFormProps<string>) {
	const time = toTimeString(value);
	useNormalizedInitial(value, time || null, onChange);
	return (
		<Input
			id={id ?? name}
			name={name}
			type="time"
			defaultValue={time}
			onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
			disabled={disabled}
		/>
	);
}

function useNormalizedInitial(
	raw: unknown,
	normalized: string | null,
	onChange: (next: string | null) => void,
): void {
	const ranRef = useRef(false);
	useEffect(() => {
		if (ranRef.current) {
			return;
		}
		ranRef.current = true;
		if (raw === normalized) {
			return;
		}
		onChange(normalized);
	}, [raw, normalized, onChange]);
}

function toIsoDate(value: unknown): string {
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return value.toISOString().slice(0, 10);
	}
	if (typeof value === "string" && value.length >= 10) {
		return value.slice(0, 10);
	}
	return "";
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

function toTimeString(value: unknown): string {
	if (typeof value === "string" && /^\d{2}:\d{2}/.test(value)) {
		return value.slice(0, 5);
	}
	const date = parseDate(value);
	if (!date) {
		return "";
	}
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
