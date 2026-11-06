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

declare const translations: unique symbol;

/**
 * A translatable field's value: one entry per content locale. Structurally a
 * `Record<string, V>`; the phantom brand tells it apart from a plain record such
 * as a keyvalue field's, so `T extends Translations<infer V>` maps it back to `V`.
 */
export type Translations<V> = Record<string, V> & { readonly [translations]: V };

/** The same payload without the phantom brand, as plain data is written. */
type Unbranded<T> =
	T extends Translations<infer V>
		? Record<string, Unbranded<V>>
		: T extends readonly (infer E)[]
			? Unbranded<E>[]
			: T extends object
				? { [K in keyof T]: Unbranded<T[K]> }
				: T;

type Flagged<C, K extends string> = C extends { readonly __flags: { readonly [P in K]: true } }
	? true
	: false;

/** `translatable()` on a repeater cascades to its sub-fields instead of wrapping the rows. */
type Cascaded<R extends readonly unknown[]> = {
	[I in keyof R]: R[I] extends { readonly __field: unknown }
		? R[I] & { readonly __flags: { readonly translatable: true } }
		: R[I];
};

type Rows<C, R extends readonly unknown[]> =
	Flagged<C, "translatable"> extends true
		? FormValues<Cascaded<R>>[] | null
		: FormValues<R>[] | null;

/** One value per selection, then one per locale: `translatable()` keeps `nullable|array` on the key. */
type Shaped<C, V> = C extends { readonly __rows: infer R extends readonly unknown[] }
	? Rows<C, R>
	: Flagged<C, "translatable"> extends true
		? Translations<NonNullable<Listed<C, V>> | null> | null
		: Listed<C, V>;

type Listed<C, V> = Flagged<C, "multiple"> extends true ? NonNullable<V>[] | null : V;

type ValueOf<C, V> = Flagged<C, "required"> extends true ? NonNullable<Shaped<C, V>> : Shaped<C, V>;

type ValuesOf<C> = C extends { readonly __field: { name: infer N extends string; value: infer V } }
	? { [K in N]: ValueOf<C, V> }
	: C extends { readonly __children: infer CC extends readonly unknown[] }
		? ValuesOf<CC[number]>
		: never;

/** The submitted payload of a form, inferred from the fields it contains. */
export type FormValues<C extends readonly unknown[]> = Simplify<
	UnionToIntersection<ValuesOf<C[number]>>
>;

/** One locale picked: a translatable value becomes its field value, required keeps it non-null. */
type Picked<T> =
	T extends Translations<infer V>
		? NonNullable<Picked<V>>
		: T extends readonly (infer E)[]
			? Picked<E>[]
			: T extends object
				? { [K in keyof T]: Picked<T[K]> }
				: T;

/**
 * `FormValues` with each translatable field resolved to one locale's value, as a
 * reader that picks the visitor's language sees it; repeater sub-fields included.
 */
export type LocalizedFormValues<C extends readonly unknown[]> = Picked<FormValues<C>>;

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
	record(record: Partial<Unbranded<FormValues<C>>> & Record<string, unknown>): this {
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
