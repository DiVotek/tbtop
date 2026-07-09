import { Link } from "@inertiajs/react";
import { cn } from "../lib/cn";
import type { RenderProps } from "../render/blockRegistry";

type ListItemColor = "success" | "warning" | "danger" | "muted";

export interface ListItem {
	title: string;
	meta?: string;
	color?: ListItemColor;
	url?: string;
}

export interface ListBlockOptions {
	items?: ListItem[];
}

// Static class map — Tailwind only emits classes it sees verbatim in source.
const DOT_COLORS: Record<ListItemColor, string> = {
	success: "bg-emerald-500",
	warning: "bg-amber-500",
	danger: "bg-red-500",
	muted: "bg-muted-foreground",
};

const ROW_CLASS = "flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/40";

export function ListBlock({ options }: RenderProps<ListBlockOptions>) {
	const items = options.items ?? [];
	return (
		<div className="p-2" data-testid="list-block">
			{items.map((item, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: list items are positional
				<ListRow key={i} item={item} />
			))}
		</div>
	);
}

function ListRow({ item }: { item: ListItem }) {
	const body = (
		<>
			<span
				className={cn(
					"h-1.5 w-1.5 shrink-0 rounded-full",
					DOT_COLORS[item.color ?? "muted"],
				)}
				data-testid="list-item-dot"
				data-color={item.color ?? "muted"}
			/>
			<span className="min-w-0 flex-1 truncate text-left font-medium">{item.title}</span>
			{item.meta !== undefined && (
				<span className="shrink-0 text-xs text-muted-foreground">{item.meta}</span>
			)}
		</>
	);

	return item.url !== undefined ? (
		<Link href={item.url} className={ROW_CLASS} data-testid="list-item">
			{body}
		</Link>
	) : (
		<div className={ROW_CLASS} data-testid="list-item">
			{body}
		</div>
	);
}
