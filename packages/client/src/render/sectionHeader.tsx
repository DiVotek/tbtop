import { Link } from "@inertiajs/react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { type IconDef, NodeIcon } from "../ui/node-icon";

interface SectionHeaderAction {
	label: string;
	url: string;
}

interface SectionHeaderProps {
	title?: string;
	description?: string;
	icon?: IconDef;
	action?: SectionHeaderAction;
	collapsible?: boolean;
	open: boolean;
	onToggle: () => void;
}

/** Section title/description/icon row, optionally a chevron-toggle button and a right-aligned action link. */
export function SectionHeader({
	title,
	description,
	icon,
	action,
	collapsible,
	open,
	onToggle,
}: SectionHeaderProps) {
	if (!title && !description && !icon && !action) {
		return null;
	}
	const heading = (
		<div className="flex items-center gap-2">
			{icon?.position !== "right" && <NodeIcon icon={icon} />}
			{title && <h2 className="text-lg font-semibold">{title}</h2>}
			{icon?.position === "right" && <NodeIcon icon={icon} />}
		</div>
	);
	const titleRow = collapsible ? (
		<button
			type="button"
			className="flex items-center justify-between gap-2 text-left"
			onClick={onToggle}
			aria-expanded={open}
			data-testid="section-toggle"
		>
			{heading}
			{open ? (
				<ChevronDownIcon className="size-4 shrink-0" />
			) : (
				<ChevronRightIcon className="size-4 shrink-0" />
			)}
		</button>
	) : (
		heading
	);
	return (
		<div className="flex flex-col gap-1">
			{action ? (
				<div className="flex items-center justify-between gap-2">
					{titleRow}
					<Link
						href={action.url}
						className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
						data-testid="section-action"
					>
						{action.label}
					</Link>
				</div>
			) : (
				titleRow
			)}
			{description && <p className="text-sm text-muted-foreground">{description}</p>}
		</div>
	);
}
