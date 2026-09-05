import { useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslation } from "../i18n/i18n";
import { Input } from "../ui/input";
import { type DateFormat, formatTypedDay, localeDateFormat, parseTypedDay } from "./dateTyping";

interface DateTypedInputProps {
	/** The applied ISO day this input edits; drives the text when it changes elsewhere. */
	value: string | null | undefined;
	/** Called only with a complete, valid, accepted day — never on half-typed text. */
	onCommit: (iso: string) => void;
	/** Rejects an otherwise-valid day the caller will not take, e.g. outside min/max. */
	accept?: (iso: string) => boolean;
	label: string;
	disabled?: boolean;
	testId?: string;
}

/**
 * Sends the popover's opening focus to its typed input instead of the calendar
 * grid: an admin who opened it to edit reaches for the text, and day-picker's
 * own autoFocus would re-take focus on every render and eat the keystrokes.
 */
export function focusTypedInput(content: EventTarget | null): void {
	if (!(content instanceof HTMLElement)) {
		return;
	}
	content.querySelector<HTMLInputElement>("input[data-typed-date-input]")?.focus();
}

/**
 * Typed entry above the calendar. Invalid text stays on screen and marks the
 * field: silently reverting it would let an admin leave believing they edited
 * the date. Nothing is emitted until the text parses, so a half-typed value
 * never clears the day already stored.
 */
export function DateTypedInput({
	value,
	onCommit,
	accept,
	label,
	disabled,
	testId,
}: DateTypedInputProps) {
	const t = useTranslation();
	const { locale } = useLocale();
	const errorId = useId();
	const format = useMemo<DateFormat>(
		() =>
			localeDateFormat(locale, {
				day: t("field.date.placeholder.day"),
				month: t("field.date.placeholder.month"),
				year: t("field.date.placeholder.year"),
			}),
		[locale, t],
	);

	const applied = formatTypedDay(value, locale);
	const [text, setText] = useState(applied);
	const [invalid, setInvalid] = useState(false);

	// A day picked on the calendar (or set by the form) overwrites the text, but
	// only when it actually changes: an effect on every render would race the
	// typist and swallow each keystroke.
	const lastApplied = useRef(applied);
	if (lastApplied.current !== applied) {
		lastApplied.current = applied;
		setText(applied);
		setInvalid(false);
	}

	function handleChange(next: string): void {
		setText(next);
		setInvalid(false);
		const iso = parseTypedDay(next, format);
		if (iso !== null && (accept?.(iso) ?? true)) {
			onCommit(iso);
		}
	}

	// Judging validity mid-typing would flag "05.0" as wrong; blur is the first
	// moment the admin has said they are done with the field.
	function handleBlur(): void {
		if (text.trim() === "") {
			setInvalid(false);
			return;
		}
		const iso = parseTypedDay(text, format);
		setInvalid(iso === null || !(accept?.(iso) ?? true));
	}

	return (
		<div className="flex flex-col gap-1">
			<label className="text-xs text-muted-foreground" htmlFor={`${errorId}-input`}>
				{label}
			</label>
			<Input
				id={`${errorId}-input`}
				value={text}
				onChange={(event) => handleChange(event.currentTarget.value)}
				onBlur={handleBlur}
				disabled={disabled}
				placeholder={format.placeholder}
				inputMode="numeric"
				autoComplete="off"
				data-typed-date-input=""
				data-testid={testId}
				aria-invalid={invalid || undefined}
				aria-describedby={invalid ? errorId : undefined}
			/>
			{invalid ? (
				<p id={errorId} className="text-xs text-destructive">
					{t("field.date.invalid")}
				</p>
			) : null}
		</div>
	);
}
