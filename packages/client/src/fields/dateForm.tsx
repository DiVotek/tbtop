import { CalendarIcon } from "lucide-react";
import { Suspense, useState } from "react";
import { useLocale, useTranslation } from "../i18n/i18n";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { LazyDateCalendar } from "./dateCalendarLazy";
import { parseDay } from "./daterangeDisabled";
import { toIsoDay } from "./daterangeValue";
import { formatDay } from "./dateValue";
import { type FieldFormProps, fieldId } from "./fieldProps";

/**
 * Date field control: a Popover + Calendar in single-day mode. Unlike
 * daterange, one click both selects and closes — there is no second bound to
 * wait for, so no draft/picking state is needed.
 */
export function DateForm({ id, name, value, onChange, disabled }: FieldFormProps<string>) {
	const t = useTranslation();
	const { locale } = useLocale();
	const selected = parseDay(value ?? undefined);
	const [open, setOpen] = useState(false);

	function handleSelect(day: Date | undefined): void {
		if (!day) {
			return;
		}
		onChange(toIsoDay(day));
		setOpen(false);
	}

	function handleClear(): void {
		setOpen(false);
		onChange(null);
	}

	return (
		<Popover open={open} onOpenChange={setOpen} modal>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					id={fieldId({ id, name })}
					disabled={disabled}
					name={name}
					data-testid="date-trigger"
					className="w-full justify-start font-normal"
				>
					<CalendarIcon className="size-4" aria-hidden />
					{formatDay(selected, locale) || t("field.date.placeholder")}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Suspense
					fallback={<div className="h-72 w-72 animate-pulse rounded-md bg-muted" />}
				>
					<LazyDateCalendar selected={selected} onSelect={handleSelect} />
				</Suspense>
				{selected ? (
					<div className="border-t p-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="w-full"
							data-testid="date-clear"
							onClick={handleClear}
						>
							{t("field.daterange.clear")}
						</Button>
					</div>
				) : null}
			</PopoverContent>
		</Popover>
	);
}
