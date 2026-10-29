import type { Field } from "./fields/field";
import { splitMeta } from "./meta";
import { HasWhen, mixin, WithMeta } from "./mixin";
import { Node } from "./node";

const MIN_POLL_SECONDS = 5;

export type ChartType = "line" | "bar" | "area" | "pie" | "donut";
export type ChartQuery = (
	request: Request,
	params: Record<string, unknown>,
) => Record<string, unknown>[] | Promise<Record<string, unknown>[]>;

/** A chart with static data or a server query (ChartBuilder.php). */
export class ChartBuilder {
	private queryFn?: ChartQuery;
	private paramList: Field[] = [];
	private metaBag: Record<string, unknown> = {};

	constructor(
		readonly name: string,
		readonly type: ChartType,
		private opts: Record<string, unknown> = {},
	) {}

	/** Dynamic data from the page data endpoint: `(request, params) => rows`. */
	query(fn: ChartQuery): this {
		this.queryFn = fn;
		this.opts.source = this.name;
		return this;
	}

	/**
	 * Filter fields above the chart; their values reach query() as params.
	 * Values arrive from the query string: give each field rules() (e.g.
	 * 'in:day,month'), a failing value answers 422 before the query runs.
	 */
	params(fields: Field[]): this {
		this.paramList = fields;
		return this;
	}

	/** Re-fetch every N seconds (at least 5); only with query(). */
	poll(seconds: number): this {
		if (seconds < MIN_POLL_SECONDS) {
			throw new Error(`Chart poll interval must be at least ${MIN_POLL_SECONDS} seconds.`);
		}
		this.opts.poll = seconds;
		return this;
	}

	/** Escape hatch: writes a key straight into the chart options. */
	set(key: string, value: unknown): this {
		this.opts[key] = value;
		return this;
	}

	paramFields(): Field[] {
		return this.paramList;
	}

	queryClosure(): ChartQuery | undefined {
		return this.queryFn;
	}

	toNode(): Node {
		const [options, optMeta] = splitMeta(this.opts);
		if (this.isIncluded() && options.data === undefined && this.queryFn === undefined) {
			throw new Error(`Chart "${this.name}" requires static data or a query.`);
		}
		if (options.data !== undefined) {
			this.assertScalarRows(options.data);
		}
		if (this.paramList.length > 0) {
			options.params = this.paramList.map((f) => f.toNode());
		}
		const meta = { ...optMeta, ...this.metaBag };
		return new Node(
			`chart:${this.type}`,
			{ ...options, type: this.type },
			this.name,
			meta,
		).when(this.isIncluded());
	}

	toJSON(): unknown {
		return this.toNode().toJSON();
	}

	private assertScalarRows(data: unknown): void {
		if (!Array.isArray(data)) {
			throw new TypeError(`Chart "${this.name}" data must be a list of rows.`);
		}
		const cells = data.flatMap((row) => Object.entries(row as Record<string, unknown>));
		const bad = cells.find(
			([, value]) => value !== null && !["string", "number"].includes(typeof value),
		);
		if (bad !== undefined) {
			throw new TypeError(
				`Chart "${this.name}" data column "${bad[0]}" must be a string, number or null, got ${typeof bad[1]}.`,
			);
		}
	}
}
export interface ChartBuilder extends HasWhen, WithMeta {}
mixin(ChartBuilder, [HasWhen, WithMeta]);
