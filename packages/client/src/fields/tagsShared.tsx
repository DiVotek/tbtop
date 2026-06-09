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
}

export function Chips({ name, value, onRemove, labelFor }: ChipsInput) {
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
						className="text-muted-foreground hover:text-foreground"
					>
						×
					</button>
				</span>
			))}
		</>
	);
}
