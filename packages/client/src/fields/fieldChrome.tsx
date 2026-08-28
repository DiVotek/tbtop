import { InfoIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Label } from "../ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export type FieldChromeLayout = "default" | "inline";

export interface FieldChromeProps {
	fieldId: string;
	/** Full data path ("title", "items.0.title") — the data-field-name anchor and error testid. */
	name: string;
	label?: string;
	required?: boolean;
	tooltip?: string;
	helperText?: string;
	error?: string;
	layout?: FieldChromeLayout;
	children: ReactNode;
}

/**
 * The presentational shell around one form control — label, tooltip, helper
 * text, and inline error — shared by top-level fields and repeater
 * sub-fields so a field looks and reads (aria) the same at any depth.
 */
export function FieldChrome({
	fieldId,
	name,
	label,
	required,
	tooltip,
	helperText,
	error,
	layout = "default",
	children,
}: FieldChromeProps) {
	const labelNode = label && (
		<Label htmlFor={fieldId}>
			{label}
			{required && <span className="text-destructive">*</span>}
			{tooltip && <FieldTooltip text={tooltip} />}
		</Label>
	);
	const body =
		layout === "inline" ? (
			<div className="flex items-center gap-2">
				{children}
				{labelNode}
			</div>
		) : (
			<>
				{labelNode}
				{children}
			</>
		);
	return (
		<div className="flex flex-col gap-1.5" data-field-name={name}>
			{body}
			{helperText && <FieldHelperText id={helperTextId(fieldId)} text={helperText} />}
			{error && <FieldError id={fieldErrorId(fieldId)} name={name} message={error} />}
		</div>
	);
}

/**
 * Checkbox is a control-first, inline-label layout (control left, label
 * right, one row) — not the label-above-control stack every other field
 * kind uses. Other choice fields (boolean/switch, radio, etc.) keep the
 * default stack; only checkbox needs this treatment.
 */
export function chromeLayoutFor(kind: string): FieldChromeLayout {
	return kind === "checkbox" ? "inline" : "default";
}

export function fieldErrorId(fieldId: string): string {
	return `${fieldId}-error`;
}

export function helperTextId(fieldId: string): string {
	return `${fieldId}-helper`;
}

/**
 * The `aria-describedby` value for a field: the error id when a validation
 * error is present, the helper id when only helper text is present, both
 * (error first — the more urgent) when present together, or undefined when
 * neither exists (an empty attribute is worse than no attribute).
 */
export function describedBy(
	fieldId: string,
	fieldError: string | undefined,
	helperText: string | undefined,
): string | undefined {
	const ids = [
		fieldError ? fieldErrorId(fieldId) : null,
		helperText ? helperTextId(fieldId) : null,
	].filter((id): id is string => id !== null);
	return ids.length > 0 ? ids.join(" ") : undefined;
}

export function FieldError({ id, name, message }: { id?: string; name: string; message: string }) {
	return (
		<p
			id={id}
			role="alert"
			className="text-sm text-destructive"
			data-testid={`field-error-${name}`}
		>
			{message}
		</p>
	);
}

function FieldHelperText({ id, text }: { id?: string; text: string }) {
	return (
		<p id={id} className="text-sm text-muted-foreground" data-testid="field-helper-text">
			{text}
		</p>
	);
}

function FieldTooltip({ text }: { text: string }) {
	return (
		<Tooltip>
			<TooltipTrigger
				type="button"
				aria-label={text}
				className="inline-flex items-center text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<InfoIcon className="size-3.5" aria-hidden />
			</TooltipTrigger>
			<TooltipContent>{text}</TooltipContent>
		</Tooltip>
	);
}
