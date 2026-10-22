import { SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "../../i18n/i18n";
import { parseKeybinding, registerKeybinding } from "../../structure/keybinding";
import { NodeIcon } from "../../ui/node-icon";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogTitle,
} from "../../ui/revola";
import type { NavGroup } from "../chromeContext";
import { buildPaletteItems, filterPaletteItems } from "./paletteItems";
import type { CommandPaletteData } from "./types";

interface CommandPaletteProps {
	nav: NavGroup[];
	data: CommandPaletteData;
}

// New-gen shape: the palette mirrors upstream's CommandDialog anatomy
// (`cn-command-dialog` > `cn-command` > input wrapper/group + `cn-command-list`
// > `cn-command-group` > `cn-command-item`), with visuals in
// `ui/presets/style-preset-*.css`. Our deltas: no cmdk — filtering, hotkey and
// arrow-key selection are ours, so the highlighted row carries `data-selected`
// itself; the overlay is ResponsiveDialog (dialog-only), not the dialog
// primitive; the nav group label sits where upstream puts a shortcut, but keeps
// the item's type scale instead of `cn-command-shortcut`; `max-md:text-base`
// keeps iOS Safari from zooming on focus (see `ui/input.tsx`).

/** ⌘K overlay: search and jump to nav destinations + custom commands. */
export function CommandPalette({ nav, data }: CommandPaletteProps) {
	const t = useTranslation();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [selected, setSelected] = useState(0);

	const items = useMemo(() => buildPaletteItems(nav, data), [nav, data]);
	const filtered = useMemo(() => filterPaletteItems(items, query), [items, query]);

	useEffect(() => {
		const spec = parseKeybinding(data.hotkey);
		if (!spec) {
			return;
		}
		return registerKeybinding(spec, () => setOpen(true));
	}, [data.hotkey]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset highlight whenever the result set changes
	useEffect(() => {
		setSelected(0);
	}, [query, filtered.length]);

	function close() {
		setOpen(false);
		setQuery("");
		setSelected(0);
	}

	function run(index: number) {
		const item = filtered[index];
		if (!item) {
			return;
		}
		close();
		item.run();
	}

	function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setSelected((i) => Math.min(i + 1, filtered.length - 1));
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			setSelected((i) => Math.max(i - 1, 0));
		} else if (event.key === "Enter") {
			event.preventDefault();
			run(selected);
		}
	}

	return (
		<ResponsiveDialog
			open={open}
			onOpenChange={(next) => {
				if (next) {
					setOpen(true);
				} else {
					close();
				}
			}}
			onlyDialog
		>
			<ResponsiveDialogContent
				showCloseButton={false}
				// `cn-dialog-content` (grid, gap-4, p-4) and `cn-command-dialog`
				// sit on the same element; these utilities settle the layout.
				className="cn-command-dialog flex flex-col gap-0 overflow-hidden p-0"
				data-testid="command-palette"
			>
				<ResponsiveDialogTitle className="sr-only">
					{t("palette.title")}
				</ResponsiveDialogTitle>
				<ResponsiveDialogDescription className="sr-only">
					{t("palette.description")}
				</ResponsiveDialogDescription>
				<div
					data-slot="command"
					className="cn-command flex size-full min-h-0 flex-col overflow-hidden"
				>
					<div data-slot="command-input-wrapper" className="cn-command-input-wrapper">
						<div
							data-slot="input-group"
							role="group"
							className="cn-input-group cn-command-input-group group/input-group relative flex w-full min-w-0 items-center"
						>
							<input
								// biome-ignore lint/a11y/noAutofocus: a command palette focuses its input on open by design
								autoFocus
								type="text"
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								onKeyDown={onKeyDown}
								placeholder={data.placeholder ?? t("palette.placeholder")}
								aria-label={data.placeholder ?? t("palette.placeholder")}
								data-slot="command-input"
								className="cn-command-input min-w-0 flex-1 bg-transparent outline-hidden placeholder:text-muted-foreground max-md:text-base"
								data-testid="command-palette-input"
							/>
							<div
								data-slot="input-group-addon"
								data-align="inline-start"
								className="cn-input-group-addon cn-input-group-addon-align-inline-start order-first flex items-center justify-center select-none"
							>
								<SearchIcon className="cn-command-input-icon" />
							</div>
						</div>
					</div>
					<div
						data-slot="command-list"
						className="cn-command-list overflow-x-hidden overflow-y-auto"
					>
						{filtered.length === 0 ? (
							<div data-slot="command-empty" className="cn-command-empty">
								{t("palette.no_results")}
							</div>
						) : (
							<ul data-slot="command-group" className="cn-command-group">
								{filtered.map((item, index) => (
									<li key={item.id}>
										<button
											type="button"
											data-slot="command-item"
											data-selected={index === selected || undefined}
											className="cn-command-item group/command-item w-full text-left"
											onMouseEnter={() => setSelected(index)}
											onMouseDown={(event) => {
												event.preventDefault();
												run(index);
											}}
										>
											<NodeIcon icon={item.icon} />
											<span className="flex-1 truncate">{item.label}</span>
											{item.group ? (
												<span className="shrink-0 text-muted-foreground">
													{item.group}
												</span>
											) : null}
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
