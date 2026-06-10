import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { useNearestFormController } from "../structure/formContext";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";
import { slugify } from "./slugify";

interface SlugOptionsBag {
	fromField?: string;
}

// Dotted paths reach into nested sources, e.g. translatable "title.en".
function sourceAt(data: Record<string, unknown>, path: string): string {
	const resolved = path
		.split(".")
		.reduce<unknown>(
			(acc, key) =>
				acc !== null && typeof acc === "object"
					? (acc as Record<string, unknown>)[key]
					: undefined,
			data,
		);
	return typeof resolved === "string" || typeof resolved === "number" ? String(resolved) : "";
}

export function SlugCell({ value }: FieldCellProps<string>) {
	return <span>{value ?? ""}</span>;
}

export function SlugForm({
	name,
	value,
	onChange,
	options,
}: FieldFormProps<string, SlugOptionsBag>) {
	const fromField = options?.fromField ?? "";
	const ctrl = useNearestFormController();
	const syncBroken = useRef(false);
	const [isEditing, setIsEditing] = useState(false);
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	const currentSlug = typeof value === "string" ? value : "";
	const sourceValue = ctrl ? sourceAt(ctrl.data, fromField) : "";

	const emitDerived = useCallback((source: string) => {
		const derived = slugify(source);
		onChangeRef.current(derived === "" ? null : derived);
	}, []);

	useEffect(() => {
		if (syncBroken.current) {
			return;
		}
		emitDerived(sourceValue);
	}, [sourceValue, emitDerived]);

	function handleInputChange(next: string): void {
		syncBroken.current = true;
		onChangeRef.current(next === "" ? null : next);
	}

	function handleClear(): void {
		syncBroken.current = false;
		setIsEditing(false);
		onChangeRef.current(null);
	}

	function handleGenerate(): void {
		syncBroken.current = false;
		setIsEditing(false);
		emitDerived(sourceValue);
	}

	const t = useTranslation();
	return (
		<div data-field={name} className="flex flex-col gap-2">
			<div className="flex items-center gap-2">
				<input
					type="text"
					value={currentSlug}
					readOnly={!isEditing}
					onChange={(e) => handleInputChange(e.target.value)}
					onFocus={() => setIsEditing(true)}
					onBlur={() => {
						if (!syncBroken.current) {
							setIsEditing(false);
						}
					}}
					className="flex-1 rounded border border-input bg-background px-3 py-1.5 text-sm font-mono"
				/>
				<button
					type="button"
					onClick={handleClear}
					className="rounded border border-input px-2 py-1.5 text-sm"
				>
					{t("field.slug.clear")}
				</button>
				<button
					type="button"
					onClick={handleGenerate}
					className="rounded border border-input px-2 py-1.5 text-sm"
				>
					{t("field.slug.generate")}
				</button>
			</div>
		</div>
	);
}
