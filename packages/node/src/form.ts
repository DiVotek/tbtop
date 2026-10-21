import { z } from "zod";
import { Action, type ActionHandler } from "./actions";
import { Field } from "./fields";
import { type Buildable, type Child, Container, node, toWire, type WireNode, walk } from "./node";

type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (
	x: infer I,
) => void
	? I
	: never;

type Simplify<T> = { [K in keyof T]: T[K] } & {};

type ValuesOf<C> = C extends { readonly __field: { name: infer N extends string; value: infer V } }
	? { [K in N]: V }
	: C extends { readonly __children: infer CC extends readonly unknown[] }
		? ValuesOf<CC[number]>
		: never;

/** The submitted payload of a form, inferred from the fields it contains (sections included). */
export type FormValues<C extends readonly unknown[]> = Simplify<
	UnionToIntersection<ValuesOf<C[number]>>
>;

export class Form<C extends readonly Child[] = readonly Child[]> implements Buildable {
	declare readonly __children: C;
	private recordData: Record<string, unknown> = {};
	submitHandler?: ActionHandler;

	constructor(
		readonly name: string,
		readonly children: C,
	) {
		for (const action of this.collect(Action)) {
			action.form = this;
		}
	}

	record(data: Partial<FormValues<C>> & Record<string, unknown>): this {
		this.recordData = data;
		return this;
	}

	getRecord(): Record<string, unknown> {
		return this.recordData;
	}

	onSubmit(handler: ActionHandler<FormValues<C>>): this {
		this.submitHandler = handler as ActionHandler;
		return this;
	}

	/** Every field, at any depth (RuleWalker.php). */
	fields(): Field[] {
		return this.collect(Field) as Field[];
	}

	/** One object schema for the whole payload: only declared keys survive. */
	schema(): z.ZodObject {
		return z.object(Object.fromEntries(this.fields().map((f) => [f.name, f.schema()])));
	}

	walkChildren(): readonly unknown[] {
		return this.children;
	}

	toNode(): WireNode {
		return node(
			"form",
			{ name: this.name, children: this.children.map(toWire) },
			{ name: this.name },
		);
	}

	private collect<T>(type: abstract new (...args: never[]) => T): T[] {
		const found: T[] = [];
		for (const child of this.children) {
			walk(child, (v) => {
				if (v instanceof type) {
					found.push(v);
				}
			});
		}
		return found;
	}
}

export { Container };
