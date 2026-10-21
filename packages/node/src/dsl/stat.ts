import { HasWhen, mixin, WithMeta } from "./mixin";
import { Node } from "./node";

const SEMANTIC = ["success", "warning", "danger"];
const MIN_POLL_SECONDS = 5;

type Lazy<T> = T | (() => T | Promise<T>);

function oneOf(value: string, allowed: string[], label: string): string {
	if (!allowed.includes(value)) {
		throw new Error(`Invalid ${label} "${value}". Allowed: ${allowed.join(", ")}.`);
	}
	return value;
}

/** A KPI tile with optional delta, icon, color and sparkline (Stat.php). */
export class Stat {
	private valueOf: Lazy<unknown> = null;
	private opts: Record<string, unknown> = {};
	private tail: Record<string, unknown> = {};
	private pollSeconds: number | null = null;
	private metaBag: Record<string, unknown> = {};

	constructor(readonly label: string) {}

	/** The headline value: a scalar, or a closure resolved at render (and per poll tick). */
	value(value: Lazy<unknown>): this {
		this.valueOf = value;
		return this;
	}

	/** Sub-label under the value, optionally tinted success/warning/danger. */
	description(description: string | null, color?: string): this {
		this.opts.description = description ?? undefined;
		if (color !== undefined) {
			this.opts.descriptionColor = oneOf(color, SEMANTIC, "description color");
		}
		return this;
	}

	/** Change indicator next to the value, e.g. delta('+12%', 'up'). */
	delta(text: string, direction: "up" | "down" | "flat"): this {
		this.opts.delta = { text, direction };
		return this;
	}

	/** Tint for the value/icon. */
	color(color: string): this {
		this.opts.color = color;
		return this;
	}

	/** Trend arrow after the description. */
	trend(direction: "up" | "down"): this {
		this.opts.trend = oneOf(direction, ["up", "down"], "trend direction");
		return this;
	}

	/** Mini trend chart from a plain list of numbers. */
	sparkline(numbers: number[], position: "inline" | "bottom" = "inline"): this {
		oneOf(position, ["inline", "bottom"], "sparkline position");
		this.opts.sparkline = numbers;
		this.opts.sparklinePosition = position === "inline" ? undefined : position;
		return this;
	}

	/** Tint of the sparkline: success|warning|danger|primary. */
	sparklineColor(color: string): this {
		this.opts.sparklineColor = oneOf(color, [...SEMANTIC, "primary"], "sparkline color");
		return this;
	}

	/** Make the whole card a link. */
	url(url: string): this {
		this.opts.url = url;
		return this;
	}

	/** Open url() in a new tab. No effect without url(). */
	openUrlInNewTab(condition = true): this {
		this.opts.newTab = condition || undefined;
		return this;
	}

	/** Re-resolve the value every N seconds (at least 5) from the data endpoint. */
	poll(seconds: number): this {
		if (seconds < MIN_POLL_SECONDS) {
			throw new Error(`Stat poll interval must be at least ${MIN_POLL_SECONDS} seconds.`);
		}
		this.pollSeconds = seconds;
		return this;
	}

	/** Lucide icon name, placed left (default) or right of the label. */
	icon(name: string, position: "left" | "right" = "left"): this {
		this.tail.icon = { name, position: oneOf(position, ["left", "right"], "icon position") };
		return this;
	}

	/** Tooltip text shown on hover. */
	tooltip(text: string): this {
		this.tail.tooltip = text;
		return this;
	}

	/** The poll resolver; undefined without poll(). */
	queryClosure(): (() => Promise<Record<string, unknown>>) | undefined {
		if (this.pollSeconds === null) {
			return undefined;
		}
		return async () => {
			const out: Record<string, unknown> = { value: await this.resolveValue() };
			for (const key of ["description", "sparkline"]) {
				if (this.opts[key] !== undefined) {
					out[key] = this.opts[key];
				}
			}
			return out;
		};
	}

	toNode(): Node {
		const o = this.opts;
		const options: Record<string, unknown> = { label: this.label, value: this.resolveValue() };
		for (const key of ["description", "descriptionColor", "trend", "delta", "color"]) {
			options[key] = o[key];
		}
		options.sparkline = o.sparkline;
		options.sparklinePosition = o.sparkline === undefined ? undefined : o.sparklinePosition;
		options.sparklineColor = o.sparklineColor;
		options.url = o.url;
		options.newTab = o.url === undefined ? undefined : o.newTab;
		if (this.pollSeconds !== null) {
			options.poll = this.pollSeconds;
			options.source = this.label;
		}
		return new Node("stat", { ...options, ...this.tail }, null, this.metaBag).when(
			this.isIncluded(),
		);
	}

	toJSON(): unknown {
		return this.toNode().toJSON();
	}

	private async resolveValue(): Promise<unknown> {
		return typeof this.valueOf === "function" ? await this.valueOf() : this.valueOf;
	}
}
export interface Stat extends HasWhen, WithMeta {}
mixin(Stat, [HasWhen, WithMeta]);
