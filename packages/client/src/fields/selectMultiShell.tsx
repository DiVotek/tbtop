import { Combobox } from "@base-ui/react/combobox";
import { Children, useRef, useState } from "react";
import { useDensity } from "../app/densityContext";
import { useTranslation } from "../i18n/i18n";
import { cn } from "../lib/cn";
import { inputCompactFontClass, inputFontClass } from "../ui/input";
import { useDialogPopupContainer } from "../ui/revola";
import type { OptionMap } from "./asyncOptions";
import { fieldId } from "./fieldProps";
import { SelectCreateDialog } from "./selectCreateDialog";
import { SelectOptionContent } from "./selectOptionContent";
import type { SelectCreateConfig, StaticOption } from "./selectShared";

export interface MultiShellRenderResult {
	exactMatch: boolean;
	nodes: React.ReactNode;
}

export interface MultiShellProps {
	id?: string;
	name: string;
	value: string[];
	/** Subset of value whose chips to display (for partial-onLoad async). Defaults to value. */
	visibleValues?: string[];
	onChange: (next: string[] | null) => void;
	onBlur?: () => void;
	disabled?: boolean;
	create: SelectCreateConfig | undefined;
	/** Resolves the option behind a selected value. */
	getOption: (v: string) => StaticOption;
	/** Async only — mutable map stashed for label-on-create. */
	resolvedLabels?: OptionMap;
	/** Async only — fired after a successful create so the list can refetch. */
	onCreated?: () => void;
	onQueryChange?: (q: string) => void;
	children: (query: string) => MultiShellRenderResult;
}

export function MultiComboboxShell({
	id,
	name,
	value,
	visibleValues,
	onChange,
	onBlur,
	disabled,
	create,
	getOption,
	resolvedLabels,
	onCreated,
	onQueryChange,
	children,
}: MultiShellProps) {
	const displayValues = visibleValues ?? value;
	const density = useDensity();
	const t = useTranslation();
	const popupContainer = useDialogPopupContainer();
	const [query, setQuery] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const chipsRef = useRef<HTMLDivElement>(null);

	function handleQueryChange(q: string): void {
		setQuery(q);
		onQueryChange?.(q);
	}

	// Keeping the text would leave the async list filtered by a search the user
	// already acted on, so the next pick starts from the first page again.
	function handleValueChange(next: string[] | null): void {
		onChange(next ?? []);
		handleQueryChange("");
	}

	const { nodes: optionNodes, exactMatch } = children(query);

	const trimmedQuery = query.trim();
	const showCreate = create !== undefined && trimmedQuery.length > 0 && !exactMatch;
	const isEmpty = Children.count(optionNodes) === 0;

	function handleCreateSuccess(newValue: string, label: string): void {
		if (resolvedLabels) {
			resolvedLabels[newValue] = { value: newValue, label };
		}
		if (!value.includes(newValue)) {
			onChange([...value, newValue]);
		}
		onCreated?.();
		setCreateOpen(false);
		setQuery("");
		onQueryChange?.("");
	}

	return (
		<>
			<Combobox.Root
				multiple
				value={value}
				onValueChange={handleValueChange}
				disabled={disabled}
			>
				{/* Root is a provider, not a DOM node — testid goes on Chips. */}
				<Combobox.Chips
					ref={chipsRef}
					data-slot="select-multi-control"
					data-testid={`select-${name}`}
					onBlur={onBlur}
					className={cn(
						"flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1",
						density === "compact" && "min-h-8",
					)}
				>
					{displayValues.map((v) => (
						<Combobox.Chip
							key={v}
							data-testid={`chip-${v}`}
							className="flex items-center gap-1 rounded border border-primary bg-primary px-2 py-0.5 text-primary-foreground text-xs"
						>
							<SelectOptionContent option={getOption(v)} surface="inline" />
							<Combobox.ChipRemove
								// Always the plain label: markup would land in the
								// accessible name verbatim.
								aria-label={t("field.select.remove").replace(
									"{label}",
									getOption(v).label,
								)}
								className="text-primary-foreground hover:text-foreground"
							>
								×
							</Combobox.ChipRemove>
						</Combobox.Chip>
					))}
					<Combobox.Input
						id={fieldId({ id, name })}
						value={query}
						onChange={(e) => handleQueryChange(e.target.value)}
						className={cn(
							"min-w-32 flex-1 bg-transparent outline-none placeholder:text-muted-foreground",
							inputFontClass,
							density === "compact" && inputCompactFontClass,
						)}
						placeholder={
							displayValues.length === 0 ? t("field.select.multi_placeholder") : ""
						}
					/>
				</Combobox.Chips>

				<Combobox.Portal container={popupContainer ?? undefined}>
					{/* Without this the popup anchors to the input, which the chips
					    shrink as selections accumulate. */}
					<Combobox.Positioner className="z-50" sideOffset={4} anchor={chipsRef}>
						<Combobox.Popup className="w-[var(--anchor-width)] rounded-md border border-input bg-background shadow-md">
							<Combobox.List className="max-h-60 overflow-y-auto p-1">
								{/* Rows arrive as children, so Combobox.Empty — which reads Base
								    UI's own collection — would always consider the list empty. */}
								{isEmpty && !showCreate && (
									<div
										data-testid={`select-empty-${name}`}
										className="px-2 py-1.5 text-muted-foreground text-sm"
									>
										{t("field.select.no_options")}
									</div>
								)}
								{optionNodes}
								{showCreate && (
									<div
										role="option"
										data-testid={`select-create-${name}`}
										aria-selected={false}
										className="cursor-pointer rounded px-2 py-1.5 text-primary text-sm hover:bg-accent"
										onClick={() => setCreateOpen(true)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												setCreateOpen(true);
											}
										}}
										tabIndex={0}
									>
										{t("field.select.create_option").replace(
											"{query}",
											trimmedQuery,
										)}
									</div>
								)}
							</Combobox.List>
						</Combobox.Popup>
					</Combobox.Positioner>
				</Combobox.Portal>
			</Combobox.Root>

			{createOpen && create && (
				<SelectCreateDialog
					fieldName={name}
					config={create}
					onSuccess={handleCreateSuccess}
					onClose={() => setCreateOpen(false)}
				/>
			)}
		</>
	);
}
