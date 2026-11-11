/** A built-in aggregate the query driver computes, or a custom value. */
export type SummaryType = "sum" | "avg" | "min" | "max" | "count" | "custom";

/** `(query) => value`: gets the table's filtered query, narrowed to the group in a row group. */
export type SummaryUsing = (query: never) => unknown;

/**
 * One summary under a table column (Summary.php), passed to
 * Column.summarize(). The built-ins aggregate the column over every row the
 * table's query matches — tab, search and filters applied, not just the page —
 * and format like the column's cells. Summary.using() hands the same filtered
 * query to a function and shows whatever it returns, text included.
 */
export class Summary {
	private constructor(
		readonly type: SummaryType,
		readonly label: string | undefined,
		readonly usingFn?: SummaryUsing,
	) {}

	/** Sum of the column. Default label: "Sum". */
	static sum(label?: string): Summary {
		return new Summary("sum", label);
	}

	/** Average of the column. Default label: "Average". */
	static avg(label?: string): Summary {
		return new Summary("avg", label);
	}

	/** Smallest value of the column. Default label: "Min". */
	static min(label?: string): Summary {
		return new Summary("min", label);
	}

	/** Largest value of the column. Default label: "Max". */
	static max(label?: string): Summary {
		return new Summary("max", label);
	}

	/** Number of matching rows, shown as a plain integer. Default label: "Count". */
	static count(label?: string): Summary {
		return new Summary("count", label);
	}

	/** A custom summary: `fn` gets the filtered query and returns a number or text. */
	static using<Q>(fn: (query: Q) => unknown, label: string): Summary {
		return new Summary("custom", label, fn as SummaryUsing);
	}

	toJSON(): { type: SummaryType; label?: string } {
		return this.label === undefined
			? { type: this.type }
			: { type: this.type, label: this.label };
	}
}
