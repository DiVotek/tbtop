import type { ReactNode } from "react";

const DEFAULT_LIMIT = 80;

/** Guard a cell: null/undefined renders nothing, else delegate to render. */
export function nullableCell<P>(
	value: P | null | undefined,
	render: (v: P) => ReactNode,
): ReactNode {
	if (value === null || value === undefined) {
		return null;
	}
	return render(value);
}

/** Single-line preview: full text in title, truncated body with ellipsis. */
export function TruncatedTextCell({
	value,
	limit = DEFAULT_LIMIT,
}: {
	value: string;
	limit?: number;
}) {
	const display = value.length > limit ? `${value.slice(0, limit)}…` : value;
	return <span title={value}>{display}</span>;
}
