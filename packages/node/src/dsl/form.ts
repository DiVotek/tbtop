import type { ActionHandler } from "./actionCtx";
import { currentContext } from "./context";
import { assertNoEmbedCollisions } from "./fields/collisions";
import { Field } from "./fields/field";
import { Daterange } from "./fields/temporal";
import { LiveRegion } from "./liveRegion";
import { HasWhen, mixin } from "./mixin";
import { includes, Node } from "./node";
import { recordData } from "./record";
import { collectAll, findIn } from "./walk";

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

/** The submitted payload of a form, inferred from the fields it contains. */
export type FormValues<C extends readonly unknown[]> = Simplify<
	UnionToIntersection<ValuesOf<C[number]>>
>;

/** A form: fields and layout, a record, an onSubmit handler (FormBuilder.php). */
export class FormBuilder<C extends readonly unknown[] = readonly unknown[]> {
	declare readonly __children: C;
	private recordValue: Record<string, unknown> = {};
	private submitFn?: ActionHandler;
	private guard: boolean | null = null;

	constructor(
		readonly name: string,
		readonly children: C,
	) {}

	/** Initial data (page props); explicit keys win over field defaults. */
	record(record: Partial<FormValues<C>> & Record<string, unknown>): this {
		this.recordValue = record;
		return this;
	}

	/** Runs after validation: `(ctx) => effects | redirect url`. */
	onSubmit(handler: ActionHandler<FormValues<C>>): this {
		this.submitFn = handler as ActionHandler;
		return this;
	}

	/** Per-form override of the unsaved-changes navigation guard. */
	guardUnsaved(enabled: boolean): this {
		this.guard = enabled;
		return this;
	}

	submitHandler(): ActionHandler | undefined {
		return this.submitFn;
	}

	/** The record as it ships: defaults seeded, dates and locale maps normalized. */
	recordData(): Record<string, unknown> {
		return recordData(this.recordValue, this.includedChildren());
	}

	/** Every field the form submits, at any depth. */
	getFields(): Field[] {
		return collectAll(this.includedChildren(), (c) => c instanceof Field) as Field[];
	}

	includedChildren(): unknown[] {
		return [...this.children].filter(includes);
	}

	/** The first field (embeds included) the predicate accepts; when(false) subtrees are skipped. */
	findField<T extends Field>(matches: (field: Field) => field is T): T | null {
		return findIn([...this.children], (c) => c instanceof Field && matches(c)) as T | null;
	}

	findLiveRegion(name: string): LiveRegion | null {
		return findIn(
			[...this.children],
			(c) => c instanceof LiveRegion && c.name === name,
		) as LiveRegion | null;
	}

	toNode(): Node {
		assertNoEmbedCollisions(this.includedChildren());
		this.seedRecordDependents();
		const options: Record<string, unknown> = { name: this.name, children: [...this.children] };
		if (this.guard !== null) {
			options.guardUnsaved = this.guard;
		} else if (!currentContext().unsavedGuard) {
			options.guardUnsaved = false;
		}
		return new Node("form", options, this.name).when(this.isIncluded());
	}

	toJSON(): unknown {
		return this.toNode().toJSON();
	}

	private seedRecordDependents(): void {
		const children = this.includedChildren();
		const regions = collectAll(children, (c) => c instanceof LiveRegion) as LiveRegion[];
		const ranged = collectAll(
			children,
			(c) => c instanceof Daterange && c.disabledRangesClosure() !== undefined,
		) as Daterange[];
		if (regions.length === 0 && ranged.length === 0) {
			return;
		}
		const record = this.recordData();
		for (const target of [...regions, ...ranged]) {
			target.seedInitialDeps(record);
		}
	}
}
export interface FormBuilder<C extends readonly unknown[] = readonly unknown[]> extends HasWhen {}
mixin(FormBuilder, [HasWhen]);
