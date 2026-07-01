import { useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
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

const DEFAULT_PLACEHOLDER = "Search…";

interface CommandPaletteProps {
	nav: NavGroup[];
	data: CommandPaletteData;
}

/** ⌘K overlay: search and jump to nav destinations + custom commands. */
export function CommandPalette({ nav, data }: CommandPaletteProps) {
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
				className="flex flex-col gap-0 overflow-hidden p-0"
				data-testid="command-palette"
			>
				<ResponsiveDialogTitle className="sr-only">Command palette</ResponsiveDialogTitle>
				<ResponsiveDialogDescription className="sr-only">
					Search and jump to a page or command
				</ResponsiveDialogDescription>
				<input
					// biome-ignore lint/a11y/noAutofocus: a command palette focuses its input on open by design
					autoFocus
					type="text"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					onKeyDown={onKeyDown}
					placeholder={data.placeholder ?? DEFAULT_PLACEHOLDER}
					aria-label={data.placeholder ?? DEFAULT_PLACEHOLDER}
					className="w-full border-b bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
					data-testid="command-palette-input"
				/>
				<ul className="max-h-80 overflow-y-auto p-1">
					{filtered.length === 0 ? (
						<li className="px-3 py-6 text-center text-sm text-muted-foreground">
							No results
						</li>
					) : (
						filtered.map((item, index) => (
							<li key={item.id}>
								<button
									type="button"
									className={cn(
										"flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors",
										index === selected
											? "bg-accent text-accent-foreground"
											: "text-foreground hover:bg-accent hover:text-accent-foreground",
									)}
									onMouseEnter={() => setSelected(index)}
									onMouseDown={(event) => {
										event.preventDefault();
										run(index);
									}}
								>
									<NodeIcon icon={item.icon} />
									<span className="flex-1 truncate">{item.label}</span>
									{item.group ? (
										<span className="shrink-0 text-xs text-muted-foreground">
											{item.group}
										</span>
									) : null}
								</button>
							</li>
						))
					)}
				</ul>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
