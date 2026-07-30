import { type KeyboardEvent, useState } from "react";
import { useDensity } from "../app/densityContext";
import { useTranslation } from "../i18n/i18n";
import { cn } from "../lib/cn";
import { inputCompactFontClass, inputFontClass } from "../ui/input";
import { type FieldFormProps, fieldId } from "./fieldProps";
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
	const density = useDensity();
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
			className={cn(
				"flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1",
				density === "compact" && "min-h-8",
			)}
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
				id={fieldId({ id, name })}
				value={input}
				disabled={disabled}
				onChange={(e) => setInput(e.target.value)}
				onKeyDown={onKeyDown}
				onBlur={onInputBlur}
				className={cn(
					"min-w-32 flex-1 bg-transparent outline-none placeholder:text-muted-foreground",
					inputFontClass,
					density === "compact" && inputCompactFontClass,
				)}
				placeholder={t("field.tags.placeholder")}
			/>
		</div>
	);
}
