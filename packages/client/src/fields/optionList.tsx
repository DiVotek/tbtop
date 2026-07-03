import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Label } from "../ui/label";

interface OptionRowProps {
	groupId: string;
	value: string;
	label: string;
	description?: string;
	disabled?: boolean;
	control: (itemId: string) => ReactNode;
}

/** A labeled control row: derives the item id and pairs control with <Label>. */
export function OptionRow({
	groupId,
	value,
	label,
	description,
	disabled,
	control,
}: OptionRowProps) {
	const itemId = `${groupId}-${value}`;
	return (
		<div className="flex items-start gap-2">
			{control(itemId)}
			<div className="flex flex-col gap-0.5">
				<Label htmlFor={itemId} className={cn(disabled && "text-muted-foreground")}>
					{label}
				</Label>
				{description && (
					<p
						className="text-xs text-muted-foreground"
						data-testid={`option-description-${value}`}
					>
						{description}
					</p>
				)}
			</div>
		</div>
	);
}
