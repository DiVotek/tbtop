import { Wand2, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "../i18n/i18n";
import { useNearestFormController } from "../structure/formContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
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

/**
 * The input is permanently read-only: the slug is only ever machine-derived.
 * Clear empties it and stops auto-derivation (so it STAYS empty while the
 * source keeps changing); Generate re-derives from the source and re-engages
 * auto mode. Mounting over an existing slug that no longer matches its source
 * starts in manual mode, so opening an edit form never silently rewrites a
 * published slug.
 */
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
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	const currentSlug = asString(value);
	const sourceValue = ctrl ? sourceAt(ctrl.data, fromField, panelLocale) : "";

	const emitDerived = useCallback((source: string, current: string) => {
		const derived = slugify(source);
		const next = derived === "" ? null : derived;
		// Skip the no-op emit: an empty slug is stored as "" (create-modal
		// defaults) or absent, but derives to null — writing that back with
		// nothing to actually re-derive dirties a freshly opened, untouched
		// form (initial "" vs written-back null).
		if (next === (current === "" ? null : current)) {
			return;
		}
		onChangeRef.current(next);
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
		emitDerived(sourceValue, currentSlug);
	}, [sourceValue, emitDerived, currentSlug]);

	function handleClear(): void {
		// Break auto-derivation: a cleared slug must stay empty until the user
		// explicitly asks to Generate — otherwise the derive-effect would refill
		// it from the source on the very next render.
		syncBroken.current = true;
		onChangeRef.current(null);
	}

	function handleGenerate(): void {
		syncBroken.current = false;
		emitDerived(sourceValue, currentSlug);
	}

	const t = useTranslation();
	return (
		<div data-field={name} className="flex flex-col gap-2">
			<div className="flex items-center gap-2">
				<input
					type="text"
					value={currentSlug}
					readOnly
					disabled={disabled}
					className="flex-1 rounded border border-input bg-muted/50 px-3 py-1.5 text-sm font-mono text-muted-foreground"
				/>
				<IconButton
					label={t("field.slug.clear")}
					disabled={disabled}
					onClick={handleClear}
					icon={<X className="size-4" />}
				/>
				<IconButton
					label={t("field.slug.generate")}
					disabled={disabled}
					onClick={handleGenerate}
					icon={<Wand2 className="size-4" />}
				/>
			</div>
		</div>
	);
}

interface IconButtonProps {
	label: string;
	disabled?: boolean;
	onClick: () => void;
	icon: React.ReactNode;
}

function IconButton({ label, disabled, onClick, icon }: IconButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-label={label}
					disabled={disabled}
					onClick={onClick}
					className="rounded border border-input p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
				>
					{icon}
				</button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}
