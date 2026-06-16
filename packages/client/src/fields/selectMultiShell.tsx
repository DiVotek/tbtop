import { Combobox } from "@base-ui/react/combobox";
import { useState } from "react";
import { SelectCreateDialog } from "./selectCreateDialog";
import type { SelectCreateConfig } from "./selectShared";

export interface MultiShellRenderResult {
	exactMatch: boolean;
	nodes: React.ReactNode;
}

export interface MultiShellProps {
	name: string;
	value: string[];
	/** Subset of value whose chips to display (for partial-onLoad async). Defaults to value. */
	visibleValues?: string[];
	onChange: (next: string[] | null) => void;
	onBlur?: () => void;
	disabled?: boolean;
	create: SelectCreateConfig | undefined;
	/** Resolves a display label for a selected value. */
	getLabel: (v: string) => string;
	/** Async only — mutable map stashed for label-on-create. */
	resolvedLabels?: Record<string, string>;
	onQueryChange?: (q: string) => void;
	children: (query: string) => MultiShellRenderResult;
}

export function MultiComboboxShell({
	name,
	value,
	visibleValues,
	onChange,
	onBlur,
	disabled,
	create,
	getLabel,
	resolvedLabels,
	onQueryChange,
	children,
}: MultiShellProps) {
	const displayValues = visibleValues ?? value;
	const [query, setQuery] = useState("");
	const [createOpen, setCreateOpen] = useState(false);

	function handleQueryChange(q: string): void {
		setQuery(q);
		onQueryChange?.(q);
	}

	function handleValueChange(next: string[] | null): void {
		onChange(next ?? []);
	}

	const { nodes: optionNodes, exactMatch } = children(query);

	const trimmedQuery = query.trim();
	const showCreate = create !== undefined && trimmedQuery.length > 0 && !exactMatch;

	function handleCreateSuccess(newValue: string, label: string): void {
		if (resolvedLabels) {
			resolvedLabels[newValue] = label;
		}
		if (!value.includes(newValue)) {
			onChange([...value, newValue]);
		}
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
				onOpenChange={(open) => {
					if (!open) {
						onBlur?.();
					}
				}}
			>
				{/* Root is a provider, not a DOM node — testid goes on Chips. */}
				<Combobox.Chips
					data-testid={`select-${name}`}
					className="flex min-h-9 w-full flex-wrap items-center gap-1 rounded border border-input bg-background px-2 py-1"
				>
					{displayValues.map((v) => (
						<Combobox.Chip
							key={v}
							data-testid={`chip-${v}`}
							className="flex items-center gap-1 rounded border border-primary bg-primary px-2 py-0.5 text-primary-foreground text-xs"
						>
							<span>{getLabel(v)}</span>
							<Combobox.ChipRemove
								aria-label={`Remove ${getLabel(v)}`}
								className="text-primary-foreground hover:text-foreground"
							>
								×
							</Combobox.ChipRemove>
						</Combobox.Chip>
					))}
					<Combobox.Input
						value={query}
						onChange={(e) => handleQueryChange(e.target.value)}
						className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
						placeholder={displayValues.length === 0 ? "Select…" : ""}
					/>
				</Combobox.Chips>

				<Combobox.Portal>
					<Combobox.Positioner className="z-50" sideOffset={4}>
						<Combobox.Popup className="w-[var(--anchor-width)] rounded border border-input bg-background shadow-md">
							<Combobox.List className="max-h-60 overflow-y-auto p-1">
								<Combobox.Empty className="px-2 py-1.5 text-muted-foreground text-sm">
									{showCreate ? null : "No options"}
								</Combobox.Empty>
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
										Create &ldquo;{trimmedQuery}&rdquo;
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

interface ComboboxOptionProps {
	value: string;
	label: string;
}

export function ComboboxOption({ value, label }: ComboboxOptionProps) {
	return (
		<Combobox.Item
			value={value}
			className="cursor-pointer rounded px-2 py-1.5 text-sm data-[highlighted]:bg-accent data-[selected]:font-medium"
		>
			{label}
		</Combobox.Item>
	);
}

export function matchesQuery(label: string, query: string): boolean {
	if (!query) {
		return true;
	}
	return label.toLowerCase().includes(query.toLowerCase());
}
