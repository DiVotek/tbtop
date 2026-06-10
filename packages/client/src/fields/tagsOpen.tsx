import { type KeyboardEvent, useState } from "react";
import { useTranslation } from "../i18n/i18n";
import type { FieldFormProps } from "./fieldProps";
import { Chips, type TagsOptionsBag } from "./tagsShared";

export function OpenTagsForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
}: FieldFormProps<string[], TagsOptionsBag>) {
	const t = useTranslation();
	const current = Array.isArray(value) ? value : [];
	const [input, setInput] = useState("");
	function commit(): void {
		const trimmed = input.trim();
		if (trimmed === "" || current.includes(trimmed)) {
			setInput("");
			return;
		}
		onChange([...current, trimmed]);
		setInput("");
	}
	function onKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
		if (e.key === "Enter" || e.key === ",") {
			e.preventDefault();
			commit();
		}
	}
	function onInputBlur(): void {
		commit();
		onBlur?.();
	}
	function remove(v: string): void {
		onChange(current.filter((x) => x !== v));
	}
	return (
		<div
			className="flex flex-wrap items-center gap-2 rounded border border-input bg-background px-2 py-1"
			data-testid={`tags-${name}`}
		>
			<Chips
				name={name}
				value={current}
				onRemove={remove}
				labelFor={(v) => v}
				disabled={disabled}
			/>
			<input
				id={id ?? name}
				value={input}
				disabled={disabled}
				onChange={(e) => setInput(e.target.value)}
				onKeyDown={onKeyDown}
				onBlur={onInputBlur}
				className="flex-1 bg-transparent text-sm outline-none"
				placeholder={t("field.tags.placeholder")}
			/>
		</div>
	);
}
