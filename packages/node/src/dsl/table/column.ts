// oxlint-disable max-lines -- DSL builder: fluent method lists are exempt (CLAUDE.md)
import { type AffixContent, affixNode } from "../fields/affix";
import { type BadgeMap, type BooleanStyle, badgeMeta, booleanMeta } from "../kindMeta";
import { type Choice, choicesOf, type EnumSource, normalizeOptions } from "../options";
import { appendRules } from "../rules";
import { columnWire } from "./columnWire";

export type Row = Record<string, unknown>;
export type RowFn<T = unknown> = (row: Row) => T;
export type SortUsing = (query: never, direction: "asc" | "desc") => unknown;

/** Everything a Column holds; serialized sparsely by columnWire(). */
export interface ColumnState {
	label?: string;
	kind?: string;
	sortable?: boolean;
	sortBy?: string;
	sortUsing?: SortUsing;
	searchable?: boolean;
	individuallySearchable?: boolean;
	toggleable?: boolean;
	hiddenByDefault: boolean;
	align?: string;
	icon?: { name: string; position: string };
	width?: string;
	sticky?: boolean;
	wrap?: boolean;
	noWrap?: boolean;
	tooltip?: string;
	tooltipFn?: RowFn;
	description?: string;
	descriptionFn?: RowFn;
	emphasized?: boolean;
	muted?: boolean;
	uppercase?: boolean;
	translatable?: boolean;
	formatUsing?: (value: unknown, row: Row) => unknown;
	linkFn?: RowFn;
	copyable?: { message: string; duration: number };
	kindMeta: Record<string, unknown>;
	groupColumns: Column[];
	affixes: Record<string, unknown>;
	alwaysHidden: boolean;
	visibleFn?: () => unknown;
	editAs?: "boolean" | "text" | "select" | "number";
	editInput: Record<string, unknown>;
	editOptions: Record<string, unknown>[];
	editRules: string[];
	onSave?: (row: Row, value: unknown) => unknown;
}

/**
 * One table column (Column.php): kind sugar sets the kind and its format
 * metadata; values are formatted server-side when rows are projected.
 */
export class Column {
	readonly st: ColumnState = {
		hiddenByDefault: false,
		kindMeta: {},
		groupColumns: [],
		affixes: {},
		alwaysHidden: false,
		editInput: {},
		editOptions: [],
		editRules: [],
	};

	constructor(readonly name: string) {}

	static make(name: string): Column {
		return new Column(name);
	}

	/** Header text; defaults to a humanized name. */
	label(label: string): this {
		return this.with({ label });
	}

	/** Raw kind string; prefer a kind method (money(), badge(), image()…). */
	kind(kind: string): this {
		return this.with({ kind });
	}

	/** Allow sorting by this column. */
	sortable(sortable = true): this {
		return this.with({ sortable });
	}

	/** Sort by another field (dot-path to a relation allowed). */
	sortBy(field: string): this {
		return this.with({ sortBy: field });
	}

	/** Full control over ORDER BY: `(query, direction) => query`. Wins over sortBy(). */
	sortUsing(fn: SortUsing): this {
		return this.with({ sortUsing: fn });
	}

	/** Include in the table's global search. */
	searchable(searchable = true): this {
		return this.with({ searchable });
	}

	/** A per-column search input. */
	individuallySearchable(value = true): this {
		return this.with({ individuallySearchable: value });
	}

	/** User can show/hide the column; hiddenByDefault sets the initial state. */
	toggleable(toggleable = true, hiddenByDefault = false): this {
		return this.with({ toggleable, hiddenByDefault });
	}

	/** Excluded from the wire and projection entirely. */
	hidden(): this {
		return this.with({ alwaysHidden: true });
	}

	/** `() => boolean`; false excludes the column from the wire and projection. */
	visible(fn: () => unknown): this {
		return this.with({ visibleFn: fn });
	}

	/** Cell and header alignment. */
	align(align: "left" | "center" | "right"): this {
		return this.with({ align });
	}

	/** A fixed icon beside every value. */
	icon(name: string, position: "left" | "right" = "left"): this {
		return this.with({ icon: { name, position } });
	}

	/** CSS width, e.g. '120px'. */
	width(width: string): this {
		return this.with({ width });
	}

	/**
	 * Pin the column to the left edge while the table scrolls horizontally.
	 * Sticky columns must lead the column list; the row-selection checkbox
	 * and drag handle stay pinned with them.
	 */
	sticky(value = true): this {
		return this.with({ sticky: value });
	}

	isSticky(): boolean {
		return this.st.sticky === true;
	}

	/** Wrap onto multiple lines; last of wrap/truncate/noWrap wins. */
	wrap(): this {
		return this.with({ wrap: true, noWrap: undefined });
	}

	/** Truncate with an ellipsis; last of wrap/truncate/noWrap wins. */
	truncate(): this {
		return this.with({ wrap: false, noWrap: undefined });
	}

	/** Single line, may overflow; last of wrap/truncate/noWrap wins. */
	noWrap(value = true): this {
		return value ? this.with({ noWrap: true, wrap: undefined }) : this.with({ noWrap: false });
	}

	/** Static tooltip, or a per-row `(row) => text` resolved server-side. */
	tooltip(tooltip: string | RowFn): this {
		return typeof tooltip === "function"
			? this.with({ tooltipFn: tooltip })
			: this.with({ tooltip });
	}

	/** Muted second line: static, or per row `(row) => text`. */
	description(description: string | RowFn): this {
		return typeof description === "function"
			? this.with({ descriptionFn: description })
			: this.with({ description });
	}

	/** Read the cell from the record's locale map. */
	translatable(value = true): this {
		return this.with({ translatable: value });
	}

	/** Emphasized primary link-style text. */
	emphasized(value = true): this {
		return this.with({ emphasized: value });
	}

	/** Small muted text. */
	muted(value = true): this {
		return this.with({ muted: value });
	}

	/** Uppercase with wide tracking. */
	uppercase(value = true): this {
		return this.with({ uppercase: value });
	}

	/** Server-side formatter `(value, row) => display`; replaces kind formatting. */
	formatUsing(fn: (value: unknown, row: Row) => unknown): this {
		return this.with({ formatUsing: fn });
	}

	/** Copy-to-clipboard button next to the value. */
	copyable(message = "Copied", duration = 2000): this {
		return this.with({ copyable: { message, duration } });
	}

	/** Date kind, formatted server-side (default 'Y-m-d'). */
	date(format?: string): this {
		return this.kindWith("date", format === undefined ? {} : { format });
	}

	/** Date-time kind (default 'Y-m-d H:i:s'). */
	datetime(format?: string): this {
		return this.kindWith("datetime", format === undefined ? {} : { format });
	}

	/** Time kind (default 'H:i'). */
	time(format?: string): this {
		return this.kindWith("time", format === undefined ? {} : { format });
	}

	/** Number kind; decimals format it server-side. */
	number(decimals?: number): this {
		return this.kindWith("number", decimals === undefined ? {} : { decimals });
	}

	/** Money from minor units: 1999 → "19.99 USD". */
	money(currency: string): this {
		return this.kindWith("money", { currency });
	}

	/** Boolean icon with optional icon/color overrides. */
	boolean(style: BooleanStyle = {}): this {
		const meta = booleanMeta(style);
		return this.kindWith("boolean", Object.keys(meta).length > 0 ? { boolean: meta } : {});
	}

	/** Colored badge from a value → {label?, color?} map or an enum source. */
	badge(map: BadgeMap): this {
		return this.kindWith("badge", { badge: badgeMeta(map) });
	}

	/** An icon per value. */
	iconMap(map: Record<string, string | { icon: string; color?: string }>): this {
		return this.kindWith("icon", { iconMap: map });
	}

	/** Thumbnail image. */
	image(): this {
		return this.with({ kind: "image" });
	}

	/** Color swatch. */
	color(): this {
		return this.with({ kind: "color" });
	}

	/** Link kind: `(row) => url | null`, optionally external with an icon. */
	link(url: RowFn<string | null>, external = false, icon?: string): this {
		const meta: Record<string, unknown> = {};
		if (external) {
			meta.external = true;
		}
		if (icon !== undefined) {
			meta.icon = icon;
		}
		this.with({ kind: "link", linkFn: url });
		return Object.keys(meta).length > 0 ? this.kindWith("link", { link: meta }) : this;
	}

	/** Several leaf columns stacked in one cell; sort/search belong on the children. */
	group(columns: Column[]): this {
		return this.with({ kind: "group", groupColumns: columns });
	}

	/** Square shape. */
	square(): this {
		return this.metaWith({ shape: "square" });
	}

	/** Circular shape. */
	circular(): this {
		return this.metaWith({ shape: "circular" });
	}

	/** Rounded shape. */
	rounded(): this {
		return this.metaWith({ shape: "rounded" });
	}

	/** Image alt text. */
	alt(alt: string): this {
		return this.metaWith({ alt });
	}

	/** Inline boolean toggle. */
	toggle(): this {
		return this.with({ editAs: "boolean", kind: "boolean" });
	}

	/** Inline text input. */
	textInput(): this {
		return this.with({ editAs: "text", kind: this.st.kind ?? "text" });
	}

	/** Inline select. */
	selectColumn(): this {
		return this.with({ editAs: "select", kind: this.st.kind ?? "select" });
	}

	/** Inline number input; the cell ships the raw value. */
	numberInput(): this {
		return this.with({ editAs: "number", kind: this.st.kind ?? "number" });
	}

	/** Step of the inline number editor: > 0, a numeric string, or 'any'. */
	step(step: number | string): this {
		const value = step === "any" ? step : Number(step);
		if (value !== "any" && !(typeof value === "number" && value > 0)) {
			throw new Error(
				'Column::step() only accepts a positive number, a positive numeric string, or "any".',
			);
		}
		return this.with({ editInput: { ...this.st.editInput, step: value } });
	}

	/** Display node before the value. */
	prefix(content: AffixContent): this {
		return this.affix("prefix", content);
	}

	/** Display node after the value. */
	suffix(content: AffixContent): this {
		return this.affix("suffix", content);
	}

	/** Static options of an inline select. */
	options(options: Choice[] | EnumSource): this {
		const list = choicesOf(options).map(({ value, label }) => ({ value, label }));
		return this.with({ editOptions: normalizeOptions(list) });
	}

	/** Laravel rules checked before onSave runs. */
	rules(rules: string | string[]): this {
		return this.with({ editRules: appendRules(this.name, this.st.editRules, rules) });
	}

	/** Save an inline edit: `(row, value) => effects | void`. Required when editable. */
	onSave(fn: (row: Row, value: unknown) => unknown): this {
		return this.with({ onSave: fn });
	}

	isEditable(): boolean {
		return this.st.editAs !== undefined;
	}

	isVisible(): boolean {
		return (
			!this.st.alwaysHidden &&
			(this.st.visibleFn === undefined || Boolean(this.st.visibleFn()))
		);
	}

	isSortable(): boolean {
		return this.st.sortable === true;
	}

	isSearchable(): boolean {
		return this.st.searchable === true;
	}

	isIndividuallySearchable(): boolean {
		return this.st.individuallySearchable === true;
	}

	isTranslatable(): boolean {
		return this.st.translatable === true;
	}

	groupColumns(): Column[] {
		return this.st.groupColumns;
	}

	toJSON(): Record<string, unknown> {
		return columnWire(this);
	}

	private with(patch: Partial<ColumnState>): this {
		Object.assign(this.st, patch);
		return this;
	}

	private kindWith(kind: string, meta: Record<string, unknown>): this {
		return this.with({ kind, kindMeta: { ...this.st.kindMeta, ...meta } });
	}

	private metaWith(meta: Record<string, unknown>): this {
		return this.with({ kindMeta: { ...this.st.kindMeta, ...meta } });
	}

	private affix(key: string, content: AffixContent): this {
		const node = affixNode(`Column "${this.name}"`, key, content);
		const affixes = { ...this.st.affixes };
		if (node === null) {
			delete affixes[key];
		} else {
			affixes[key] = node;
		}
		return this.with({ affixes });
	}
}
