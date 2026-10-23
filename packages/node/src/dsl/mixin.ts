import { Cond, type CondOp } from "./cond";
import { WhenGate } from "./inclusion";

/**
 * PHP traits as TS mixins: a class declares `interface X extends Mixin {}`
 * and `mixin(X, [Mixin])` copies the methods onto its prototype.
 */
export function mixin(target: { prototype: object }, sources: { prototype: object }[]): void {
	for (const source of sources) {
		const descriptors = Object.getOwnPropertyDescriptors(source.prototype);
		const { constructor: _skip, ...methods } = descriptors;
		Object.defineProperties(target.prototype, methods);
	}
}

const metaOf = (builder: object): Record<string, unknown> => {
	const holder = builder as { metaBag?: Record<string, unknown> };
	holder.metaBag ??= {};
	return holder.metaBag;
};

/** Node meta plus the client-side visibility ops every node builder shares (WithMeta.php). */
export class WithMeta {
	/** Sets one node meta key directly: id, hidden, disabled, hiddenIf, disabledIf. */
	meta(key: string, value: unknown): this {
		metaOf(this)[key] = value;
		return this;
	}

	/** Client-side visibility: the node still ships, its value still submits. */
	hiddenIf(condOrField: Cond | string, op?: CondOp, value?: unknown): this {
		metaOf(this).hiddenIf = Cond.from(condOrField, op, value);
		return this;
	}

	/** Client-side disabling: the node still ships, its value still submits. */
	disabledIf(condOrField: Cond | string, op?: CondOp, value?: unknown): this {
		metaOf(this).disabledIf = Cond.from(condOrField, op, value);
		return this;
	}
}

/** Same-named WhenGate holder as a mixin (HasWhen.php). */
export class HasWhen {
	/** Server-side existence gate: false drops the node and 404s its endpoints. */
	when(condition: boolean | (() => unknown)): this {
		gateOf(this).set(condition);
		return this;
	}

	isIncluded(): boolean {
		return gateOf(this).isIncluded();
	}
}

const gateOf = (builder: object): WhenGate => {
	const holder = builder as { whenGate?: WhenGate };
	holder.whenGate ??= new WhenGate();
	return holder.whenGate;
};
