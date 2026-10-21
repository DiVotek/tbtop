import { z } from "zod";
import { type Buildable, compact, node, type WireNode } from "./node";

/**
 * Client-side constraints (compiled to zod in the browser for on-blur UX).
 * The server never trusts them: it validates with the field's own schema.
 */
interface Constraints {
	required?: true;
	min?: number;
	max?: number;
	regex?: string;
	in?: (string | number)[];
}

export interface Choice {
	value: string | number;
	label: string;
	description?: string;
	disabled?: boolean;
}

type FieldSchema = z.ZodType<unknown>;

/**
 * One field: a PHP Field + its Laravel rules, as one TS builder. `N` (name)
 * and `V` (submitted value) are phantom types the form reads to type its
 * `onSubmit` payload.
 */
export abstract class Field<N extends string = string, V = unknown> implements Buildable {
	declare readonly __field: { name: N; value: V };
	protected opts: Record<string, unknown> = {};
	protected cons: Constraints = {};
	private extraRules: ((schema: FieldSchema) => FieldSchema)[] = [];

	constructor(
		readonly kind: string,
		readonly name: N,
	) {}

	label(label: string): this {
		this.opts.label = label;
		return this;
	}

	helperText(text: string): this {
		this.opts.helperText = text;
		return this;
	}

	placeholder(text: string): this {
		this.opts.placeholder = text;
		return this;
	}

	/** Narrows the submitted value: a required text field is `string`, not `string | null`. */
	required(): this & { readonly __field: { name: N; value: NonNullable<V> } } {
		this.opts.required = true;
		this.cons.required = true;
		return this as this & { readonly __field: { name: N; value: NonNullable<V> } };
	}

	/** Server-only refinement on top of the built-in constraints (the `rules()` of PHP). */
	refine(check: (value: NonNullable<V>) => boolean | Promise<boolean>, message: string): this {
		this.extraRules.push((schema) =>
			schema.refine(
				async (v) => v === null || v === undefined || (await check(v as NonNullable<V>)),
				{
					message,
				},
			),
		);
		return this;
	}

	/** Server schema: base type + constraints + refinements. Empty strings arrive as null (Laravel parity). */
	schema(): FieldSchema {
		let schema = this.cons.required
			? this.baseSchema()
			: this.baseSchema().nullable().optional();
		for (const rule of this.extraRules) {
			schema = rule(schema);
		}
		return schema as FieldSchema;
	}

	toNode(): WireNode {
		const constraints = Object.keys(this.cons).length > 0 ? { ...this.cons } : undefined;
		return node(this.kind, compact({ ...this.opts, ...this.kindOptions(), constraints }), {
			name: this.name,
		});
	}

	protected kindOptions(): Record<string, unknown> {
		return {};
	}

	protected abstract baseSchema(): z.ZodType;
}

abstract class StringField<N extends string> extends Field<N, string | null> {
	max(length: number): this {
		this.cons.max = length;
		return this;
	}

	min(length: number): this {
		this.cons.min = length;
		return this;
	}

	regex(pattern: RegExp): this {
		this.cons.regex = pattern.source;
		return this;
	}

	protected baseSchema(): z.ZodType {
		let s = z.string();
		if (this.cons.min !== undefined) {
			s = s.min(this.cons.min);
		}
		if (this.cons.max !== undefined) {
			s = s.max(this.cons.max);
		}
		if (this.cons.regex !== undefined) {
			s = s.regex(new RegExp(this.cons.regex));
		}
		return s;
	}
}

export class Text<N extends string> extends StringField<N> {
	constructor(name: N) {
		super("text", name);
	}
}

export class Textarea<N extends string> extends StringField<N> {
	constructor(name: N) {
		super("textarea", name);
	}

	rows(rows: number): this {
		this.opts.rows = rows;
		return this;
	}
}

export class Slug<N extends string> extends StringField<N> {
	constructor(name: N) {
		super("slug", name);
	}

	/** Field the slug is generated from while the user types. */
	from(field: string): this {
		this.opts.fromField = field;
		return this;
	}
}

export class NumberField<N extends string> extends Field<N, number | null> {
	constructor(name: N) {
		super("number", name);
	}

	min(value: number): this {
		this.cons.min = value;
		return this;
	}

	max(value: number): this {
		this.cons.max = value;
		return this;
	}

	protected baseSchema(): z.ZodType {
		let s = z.coerce.number();
		if (this.cons.min !== undefined) {
			s = s.min(this.cons.min);
		}
		if (this.cons.max !== undefined) {
			s = s.max(this.cons.max);
		}
		return s;
	}
}

export class BooleanField<N extends string> extends Field<N, boolean> {
	constructor(name: N) {
		super("boolean", name);
	}

	protected baseSchema(): z.ZodType {
		return z.boolean();
	}

	// A toggle always submits true/false: null never reaches the handler.
	override schema(): FieldSchema {
		return z.preprocess(
			(v) => (v === null || v === undefined ? false : v),
			z.boolean(),
		) as FieldSchema;
	}
}

export class Select<N extends string, T extends string | number = string> extends Field<
	N,
	T | null
> {
	private choices: Choice[] = [];

	constructor(name: N) {
		super("select", name);
	}

	/** Static choices; the literal values type the submitted value. */
	options<const C extends readonly Choice[]>(choices: C): Select<N, C[number]["value"]> {
		this.choices = [...choices];
		this.cons.in = choices.map((c) => c.value);
		return this as unknown as Select<N, C[number]["value"]>;
	}

	protected kindOptions(): Record<string, unknown> {
		return { options: this.choices };
	}

	protected baseSchema(): z.ZodType {
		const values = this.choices.map((c) => c.value);
		return z.union([z.string(), z.number()]).refine((v) => values.includes(v), {
			message: "The selected value is invalid.",
		});
	}
}
