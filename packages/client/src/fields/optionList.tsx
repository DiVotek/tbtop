import type { ReactNode } from "react";
import { Label } from "../ui/label";

interface OptionRowProps {
	groupId: string;
	value: string;
	label: string;
	control: (itemId: string) => ReactNode;
}

/** A labeled control row: derives the item id and pairs control with <Label>. */
export function OptionRow({ groupId, value, label, control }: OptionRowProps) {
	const itemId = `${groupId}-${value}`;
	return (
		<div className="flex items-center gap-2">
			{control(itemId)}
			<Label htmlFor={itemId}>{label}</Label>
		</div>
	);
}
