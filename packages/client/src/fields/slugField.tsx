import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { useNearestFormController } from "../structure/formContext";
import { asString, type FieldCellProps, type FieldFormProps } from "./fieldProps";
import { slugify } from "./slugify";
import { usePanelLocale } from "./translatableWrapper";

interface SlugOptionsBag {
	fromField?: string;
}

function resolvePath(data: Record<string, unknown>, path: string): unknown {
	return path
		.split(".")
		.reduce<unknown>(
			(acc, key) =>
				acc !== null && typeof acc === "object"
					? (acc as Record<string, unknown>)[key]
					: undefined,
			data,
		);
}

// Dotted paths reach into nested sources, e.g. translatable "title.en". When
// fromField resolves to a locale-map object instead of a scalar (fromField
// points at a translatable field's root, not one of its locale leaves) and
// this slug is itself mounted inside a translatable panel, fall back to
// reading that panel's own locale off the source — panelLocale is the slug's
// own panel, independent of whichever locale tab the user has open.
function sourceAt(data: Record<string, unknown>, path: string, panelLocale: string | null): string {
	const resolved = resolvePath(data, path);
	if (typeof resolved === "string" || typeof resolved === "number") {
		return String(resolved);
	}
	if (resolved !== null && typeof resolved === "object" && panelLocale) {
		return sourceAt(data, `${path}.${panelLocale}`, null);
	}
	return "";
}

export function SlugCell({ value }: FieldCellProps<string>) {
	return <span>{value ?? ""}</span>;
}

export function SlugForm({
	name,
	value,
	onChange,
	disabled,
	options,
}: FieldFormProps<string, SlugOptionsBag>) {
	const fromField = options?.fromField ?? "";
	const ctrl = useNearestFormController();
	const panelLocale = usePanelLocale();
	const syncBroken = useRef(false);
	const [isEditing, setIsEditing] = useState(false);
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	const currentSlug = asString(value);
	const sourceValue = ctrl ? sourceAt(ctrl.data, fromField, panelLocale) : "";

	const emitDerived = useCallback((source: string) => {
		const derived = slugify(source);
		onChangeRef.current(derived === "" ? null : derived);
	}, []);

	// On mount: if a non-empty slug already exists and it differs from what
	// the source would derive, treat it as a manually-set value and start in
	// manual mode. This prevents the edit-page bug where opening an existing
	// post silently regenerated its slug.
	const isMountRef = useRef(true);
	useEffect(() => {
		if (isMountRef.current) {
			isMountRef.current = false;
			if (currentSlug !== "" && currentSlug !== slugify(sourceValue)) {
				syncBroken.current = true;
				return;
			}
		}
		if (syncBroken.current) {
			return;
		}
		emitDerived(sourceValue);
	}, [sourceValue, emitDerived, currentSlug]);

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
					disabled={disabled}
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
					disabled={disabled}
					onClick={handleClear}
					className="rounded border border-input px-2 py-1.5 text-sm"
				>
					{t("field.slug.clear")}
				</button>
				<button
					type="button"
					disabled={disabled}
					onClick={handleGenerate}
					className="rounded border border-input px-2 py-1.5 text-sm"
				>
					{t("field.slug.generate")}
				</button>
			</div>
		</div>
	);
}
