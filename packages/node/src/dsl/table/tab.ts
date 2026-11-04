/** A predefined table tab: a named server-side query scope (Tab.php). */
export class Tab<Q = unknown> {
	private labelValue: string | null = null;
	private countValue = false;
	private descriptionValue: string | null = null;
	private tail: Record<string, unknown> = {};
	private queryFn?: (query: Q) => Q;

	constructor(readonly name: string) {}

	static make<Q = unknown>(name: string): Tab<Q> {
		return new Tab<Q>(name);
	}

	/** Display text; falls back to the name. */
	label(label: string | null): this {
		this.labelValue = label;
		return this;
	}

	/** Subtitle under the page title while this tab is active. */
	description(description: string): this {
		this.descriptionValue = description;
		return this;
	}

	/** A count badge for this tab. */
	count(count = true): this {
		this.countValue = count;
		return this;
	}

	/** Narrow the table query: `(query) => query`. */
	query(fn: (query: Q) => Q): this {
		this.queryFn = fn;
		return this;
	}

	/** Lucide icon name, left (default) or right. */
	icon(name: string, position: "left" | "right" = "left"): this {
		this.tail.icon = { name, position };
		return this;
	}

	/** Tooltip shown on hover. */
	tooltip(text: string): this {
		this.tail.tooltip = text;
		return this;
	}

	hasCount(): boolean {
		return this.countValue;
	}

	queryClosure(): ((query: Q) => Q) | undefined {
		return this.queryFn;
	}

	toWire(): Record<string, unknown> {
		const out: Record<string, unknown> = {
			name: this.name,
			label: this.labelValue ?? this.name,
			count: this.countValue,
			...this.tail,
		};
		if (this.descriptionValue !== null) {
			out.description = this.descriptionValue;
		}
		return out;
	}
}
