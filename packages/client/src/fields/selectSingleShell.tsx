import { Combobox } from "@base-ui/react/combobox";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { useDensity } from "../app/densityContext";
import { useTranslation } from "../i18n/i18n";
import { cn } from "../lib/cn";
import { Input, inputCompactFontClass, inputTextClass } from "../ui/input";
import { fieldId } from "./fieldProps";
import { SelectOptionContent } from "./selectOptionContent";
import type { StaticOption } from "./selectShared";

export interface SingleShellProps {
	id?: string;
	name: string;
	value: string | null;
	/** The selected option's label, resolved outside the search results. */
	selected: StaticOption | undefined;
	onChange: (next: string | null) => void;
	onBlur?: () => void;
	disabled?: boolean;
	invalid?: boolean;
	onQueryChange: (q: string) => void;
	/** False while rows are in flight, so an empty list is not reported as "no options". */
	isEmpty: boolean;
	children: React.ReactNode;
}

export function SingleComboboxShell({
	id,
	name,
	value,
	selected,
	onChange,
	onBlur,
	disabled,
	invalid,
	onQueryChange,
	isEmpty,
	children,
}: SingleShellProps) {
	const t = useTranslation();
	const density = useDensity();
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);

	function handleQueryChange(q: string): void {
		setQuery(q);
		onQueryChange(q);
	}

	function handleValueChange(next: string | null): void {
		onChange(next);
		handleQueryChange("");
	}

	// Base UI closes the popup once the input empties. An empty
	// query is a real state here: the server's first page.
	function handleOpenChange(next: boolean, details: Combobox.Root.ChangeEventDetails): void {
		if (!next && details.reason === "input-clear") {
			return;
		}
		setOpen(next);
		if (!next) {
			handleQueryChange("");
		}
	}

	// The overlay carries the selected option's markup, so the input itself stays
	// empty and the label survives a search that does not contain it.
	const showLabel = selected !== undefined && query === "";

	return (
		<Combobox.Root
			value={value}
			onValueChange={handleValueChange}
			open={open}
			onOpenChange={handleOpenChange}
			inputValue={query}
			onInputValueChange={handleQueryChange}
			disabled={disabled}
			// Rows arrive already filtered by the server, often on columns the
			// label never shows; re-filtering here would drop those matches.
			filter={null}
			// Committing a selection otherwise writes the raw value into the input.
			// The overlay owns the display, so the input stays empty.
			itemToStringLabel={() => ""}
		>
			<div className="relative" data-testid={`select-${name}`}>
				<Combobox.Input
					render={
						<Input
							id={fieldId({ id, name })}
							onBlur={onBlur}
							aria-invalid={invalid || undefined}
							data-testid={`select-search-${name}`}
							placeholder={showLabel ? "" : t("field.select.placeholder")}
							className="pr-8"
						/>
					}
				/>
				{showLabel && selected && (
					<span
						data-testid={`select-label-${name}`}
						className={cn(
							"pointer-events-none absolute inset-y-0 right-8 left-0 flex min-w-0 items-center truncate text-foreground",
							inputTextClass,
							density === "compact" && inputCompactFontClass,
						)}
					>
						<SelectOptionContent option={selected} surface="inline" />
					</span>
				)}
				<ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 opacity-50" />
			</div>

			<Combobox.Portal>
				<Combobox.Positioner className="z-50" sideOffset={4}>
					<Combobox.Popup className="w-[var(--anchor-width)] rounded-md border border-input bg-background shadow-md">
						<Combobox.List className="max-h-60 overflow-y-auto p-1">
							{/* Rows come from the server, so Combobox.Empty — which reads Base
							    UI's own collection — would always consider the list empty. */}
							{isEmpty && (
								<div
									data-testid={`select-empty-${name}`}
									className="px-2 py-1.5 text-muted-foreground text-sm"
								>
									{t("field.select.no_options")}
								</div>
							)}
							{children}
						</Combobox.List>
					</Combobox.Popup>
				</Combobox.Positioner>
			</Combobox.Portal>
		</Combobox.Root>
	);
}
