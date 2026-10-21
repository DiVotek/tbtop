import { Cond, type CondOp } from "../cond";
import { WhenGate } from "../inclusion";
import { type Columns, validateColumns } from "../meta";
import { mixin } from "../mixin";
import { CHILD_LIST_KEYS, includes, Node } from "../node";
import { appendRules, condToRequiredRule, toConstraints } from "../rules";
import { GenericRules } from "./genericRules";
import { cascadeTranslatable } from "./translatable";

/** Narrows the submitted value type a form reads off a field. */
export type WithValue<F, V> = F & { readonly __field: { value: V } };

/**
 * Base of every field builder (Field.php). `N` and `V` are phantom types:
 * the field's name and submitted value, which a form reads to type its payload.
 */
export abstract class Field<N extends string = string, V = unknown> {
	declare readonly __field: { name: N; value: V };
	abstract readonly kind: string;
	protected opts: Record<string, unknown> = {};
	protected metaBag: Record<string, unknown> = {};
	private ruleList: string[] = [];
	private translatableFlag: boolean | null = null;
	private localeRules: Record<string, string[]> = {};
	private filterFn?: (query: unknown, value: unknown) => unknown;
	private copyableDef?: { message: string; duration: number };
	private readonly gate = new WhenGate();

	constructor(readonly name: N) {}

	/** Display label rendered above the input; defaults to a humanized name when unset. */
	label(label: string): this {
		return this.set("label", label);
	}

	/** Muted hint text rendered below the input, above any validation error. */
	helperText(text: string): this {
		return this.set("helperText", text);
	}

	/** Tooltip text shown in an info-icon popover next to the field label. */
	tooltip(text: string): this {
		return this.set("tooltip", text);
	}

	/** Flags the field required on the wire and adds a `required` rule. */
	required(): WithValue<this, NonNullable<V>> {
		this.opts.required = true;
		return this.rules("required") as WithValue<this, NonNullable<V>>;
	}

	/** Required only while the condition holds: meta.requiredIf plus the matching server rule. */
	requiredIf(condOrField: Cond | string, op?: CondOp, value?: unknown): this {
		const cond = Cond.from(condOrField, op, value);
		this.metaBag.requiredIf = cond;
		return this.rules(condToRequiredRule(cond));
	}

	/** Static required marker only, with no rule. */
	markAsRequired(state = true): this {
		this.opts.required = state;
		return this;
	}

	/** Appends Laravel rules; pass a `regex:` rule as an array element. */
	rules(rules: string | string[]): this {
		this.ruleList = appendRules(this.name, this.ruleList, rules);
		return this;
	}

	protected replaceRules(rules: string[]): this {
		this.ruleList = rules;
		return this;
	}

	/** Store the value as a per-locale map; on a repeater it cascades to the sub-fields. */
	translatable(value = true): WithValue<this, Record<string, V>> {
		this.translatableFlag = value;
		return this as WithValue<this, Record<string, V>>;
	}

	/** Rule set for one locale of a translatable field, replacing rules() there. */
	rulesForLocale(locale: string, rules: string | string[]): this {
		this.localeRules[locale] = typeof rules === "string" ? rules.split("|") : [...rules];
		return this;
	}

	/** Seeds the form value when the record has no key for this field. */
	default(value: unknown): this {
		return this.set("default", value);
	}

	/** Grid column span: 1-8 or a breakpoint object. */
	columnSpan(span: Columns): this {
		validateColumns(span, "colSpan");
		return this.set("colSpan", span);
	}

	/** Grid column start: 1-8 or a breakpoint object. */
	columnStart(start: Columns): this {
		validateColumns(start, "colStart");
		return this.set("colStart", start);
	}

	/** Escape hatch: writes a key straight into the wire options. */
	set(key: string, value: unknown): this {
		this.opts[key] = value;
		return this;
	}

	/** Server-side table filter: `(query, value) => query`. Never serialized. */
	filterUsing(fn: (query: never, value: never) => unknown): this {
		this.filterFn = fn as (query: unknown, value: unknown) => unknown;
		return this;
	}

	/** Copy-to-clipboard button next to the value. */
	copyable(message = "Copied", duration = 2000): this {
		this.copyableDef = { message, duration };
		return this;
	}

	/** Sets one node meta key directly: id, hidden, disabled, hiddenIf, disabledIf. */
	meta(key: string, value: unknown): this {
		this.metaBag[key] = value;
		return this;
	}

	/** Client-side visibility; the value still submits while hidden. */
	hiddenIf(condOrField: Cond | string, op?: CondOp, value?: unknown): this {
		this.metaBag.hiddenIf = Cond.from(condOrField, op, value);
		return this;
	}

	/** Client-side disabling; the value still submits. */
	disabledIf(condOrField: Cond | string, op?: CondOp, value?: unknown): this {
		this.metaBag.disabledIf = Cond.from(condOrField, op, value);
		return this;
	}

	/** Server-side existence gate: false drops the node and 404s its endpoints. */
	when(condition: boolean | (() => unknown)): this {
		this.gate.set(condition);
		return this;
	}

	isIncluded(): boolean {
		return this.gate.isIncluded();
	}

	isTranslatableField(): boolean {
		return this.translatableFlag === true && this.childFields().length === 0;
	}

	isTranslatableOptedOut(): boolean {
		return this.translatableFlag === false;
	}

	ruleEntries(): string[] {
		return [...this.ruleList];
	}

	localeRuleEntries(): Record<string, string[]> {
		return this.localeRules;
	}

	filterClosure(): ((query: unknown, value: unknown) => unknown) | undefined {
		return this.filterFn;
	}

	defaultValue(): unknown {
		return this.opts.default ?? null;
	}

	labelText(): string | null {
		return (this.opts.label as string | undefined) ?? null;
	}

	optionValue(key: string): unknown {
		return this.opts[key];
	}

	/** Sub-fields of a container field, the translatable cascade applied. */
	childFields(): unknown[] {
		return Object.values(this.childFieldsByKey()).flat();
	}

	private childFieldsByKey(): Record<string, unknown[]> {
		const out: Record<string, unknown[]> = {};
		for (const key of CHILD_LIST_KEYS) {
			const nested = this.opts[key];
			if (!Array.isArray(nested) || nested.length === 0) {
				continue;
			}
			const normalized = nested.filter(includes);
			if (normalized.length > 0) {
				out[key] =
					this.translatableFlag === true ? cascadeTranslatable(normalized) : normalized;
			}
		}
		return out;
	}

	toNode(): Node {
		const options: Record<string, unknown> = { ...this.opts };
		if (this.copyableDef !== undefined) {
			options.copyable = this.copyableDef;
		}
		const constraints = toConstraints(this.ruleList);
		if (Object.keys(constraints).length > 0) {
			options.constraints = constraints;
		}
		Object.assign(options, this.childFieldsByKey());
		if (this.isTranslatableField()) {
			options.translatable = true;
		}
		return new Node(this.kind, options, this.name, this.metaBag).when(this.isIncluded());
	}

	toJSON(): unknown {
		return this.toNode().toJSON();
	}
}

export interface Field<N extends string = string, V = unknown> extends GenericRules {}
mixin(Field, [GenericRules]);
