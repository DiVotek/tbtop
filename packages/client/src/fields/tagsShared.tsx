import type { ReactNode } from "react";
import type { AsyncMultiOptionsBag } from "./asyncOptions";

export interface TagOption {
	value: string;
	label: string;
}

export interface TagsOptionsBag extends AsyncMultiOptionsBag {
	options?: TagOption[];
	loading?: ReactNode;
	error?: ReactNode | ((err: Error) => ReactNode);
}

interface ChipsInput {
	name: string;
	value: string[];
	onRemove: (v: string) => void;
	labelFor: (v: string) => string;
	disabled?: boolean;
}

export function Chips({ name, value, onRemove, labelFor, disabled }: ChipsInput) {
	return (
		<>
			{value.map((v) => (
				<span
					key={v}
					data-testid={`chip-${name}-${v}`}
					className="flex items-center gap-1 rounded border border-input bg-muted px-2 py-1 text-xs"
				>
					{labelFor(v)}
					<button
						type="button"
						aria-label={`Remove ${labelFor(v)}`}
						onClick={() => onRemove(v)}
						disabled={disabled}
						className="text-muted-foreground hover:text-foreground disabled:opacity-50"
					>
						×
					</button>
				</span>
			))}
		</>
	);
}

/** Read-only chip list for table cells — labels only, no remove button. */
export function LabelChips({
	value,
	labelFor,
}: {
	value: string[];
	labelFor: (v: string) => string;
}) {
	return (
		<div className="flex flex-wrap gap-1">
			{value.map((v) => (
				<span
					key={v}
					className="rounded border border-input bg-muted px-1.5 py-0.5 text-xs"
				>
					{labelFor(v)}
				</span>
			))}
		</div>
	);
}
