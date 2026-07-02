import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { type IconDef, NodeIcon } from "../ui/node-icon";

interface SectionHeaderProps {
	title?: string;
	description?: string;
	icon?: IconDef;
	collapsible?: boolean;
	open: boolean;
	onToggle: () => void;
}

/** Section title/description/icon row, optionally a chevron-toggle button. */
export function SectionHeader({
	title,
	description,
	icon,
	collapsible,
	open,
	onToggle,
}: SectionHeaderProps) {
	if (!title && !description && !icon) {
		return null;
	}
	const heading = (
		<div className="flex items-center gap-2">
			{icon?.position !== "right" && <NodeIcon icon={icon} />}
			{title && <h2 className="text-lg font-semibold">{title}</h2>}
			{icon?.position === "right" && <NodeIcon icon={icon} />}
		</div>
	);
	return (
		<div className="flex flex-col gap-1">
			{collapsible ? (
				<button
					type="button"
					className="flex items-center justify-between gap-2 text-left"
					onClick={onToggle}
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
			)}
			{description && <p className="text-sm text-muted-foreground">{description}</p>}
		</div>
	);
}
