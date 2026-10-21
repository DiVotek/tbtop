import { Block } from "./blocks";
import { applyKindFormat } from "./kindFormat";
import { type BadgeMap, type BooleanStyle, badgeMeta, booleanMeta } from "./kindMeta";
import { Node } from "./node";

const BAKED_KINDS = ["date", "datetime", "number", "money"];
const CLIENT_META_KEYS = ["badge", "boolean", "iconMap"];

export type IconMap = Record<string, string | { icon: string; color?: string }>;

/**
 * Read-only display of one value, formatted like a table column
 * (DisplayValueBlock.php): date/money/number bake a string, badge/boolean/icon
 * ship the raw value plus meta for the client.
 */
export class DisplayValueBlock extends Block {
	private kind: string | null = null;
	private kindMeta: Record<string, unknown> = {};
	private fieldName: string | null = null;
	private multilineValue = false;
	private copyableDef: { message: string; duration: number } | null = null;

	constructor(private readonly value: unknown) {
		super();
	}

	/** Formats server-side, e.g. date('d.m.Y'); no format meta ships. */
	date(format?: string): this {
		return this.baked("date", format === undefined ? {} : { format });
	}

	/** Formats server-side as a date-time; no format meta ships. */
	datetime(format?: string): this {
		return this.baked("datetime", format === undefined ? {} : { format });
	}

	/** Formats server-side with the given decimals. */
	number(decimals?: number): this {
		return this.baked("number", decimals === undefined ? {} : { decimals });
	}

	/** Formats minor units server-side: 12345 → "123.45 USD". */
	money(currency: string): this {
		return this.baked("money", { currency });
	}

	/** Binds to a modal-data field by name; not with a baked kind. */
	field(name: string): this {
		if (this.kind !== null && BAKED_KINDS.includes(this.kind)) {
			throw new Error(
				`field() cannot combine with a baked kind ("${this.kind}"): badge/boolean/icon or no kind only.`,
			);
		}
		return this.copy({ fieldName: name });
	}

	/** Renders embedded newlines as line breaks. */
	multiline(enabled = true): this {
		return this.copy({ multilineValue: enabled });
	}

	/** A boolean icon; the raw value ships, the client renders the icon. */
	boolean(style: BooleanStyle = {}): this {
		const meta = booleanMeta(style);
		const kindMeta =
			Object.keys(meta).length > 0 ? { ...this.kindMeta, boolean: meta } : this.kindMeta;
		return this.copy({ kind: "boolean", kindMeta });
	}

	/** A badge from a value → {label?, color?} map or an enum source. */
	badge(map: BadgeMap): this {
		return this.copy({
			kind: "badge",
			kindMeta: { ...this.kindMeta, badge: badgeMeta(map) },
		});
	}

	/** An icon per value; an unmatched value falls back to text. */
	icon(map: IconMap): this {
		return this.copy({
			kind: "icon",
			kindMeta: { ...this.kindMeta, iconMap: map },
		});
	}

	/** Copy-to-clipboard button next to the value. */
	copyable(message = "Copied", duration = 2000): this {
		return this.copy({ copyableDef: { message, duration } });
	}

	toNode(): Node {
		const options: Record<string, unknown> = {
			value: applyKindFormat(this.kind ?? "", this.kindMeta, this.value),
		};
		if (this.kind !== null) {
			options.kind = this.kind;
		}
		for (const key of CLIENT_META_KEYS) {
			if (this.kindMeta[key] !== undefined) {
				options[key] = this.kindMeta[key];
			}
		}
		if (this.copyableDef !== null) {
			options.copyable = this.copyableDef;
		}
		if (this.fieldName !== null) {
			options.field = this.fieldName;
		}
		if (this.multilineValue) {
			options.multiline = true;
		}
		return new Node("displayValue", options);
	}

	private baked(kind: string, meta: Record<string, unknown>): this {
		if (this.fieldName !== null) {
			throw new Error(
				`"${kind}" cannot combine with field() — its formatting bakes at author time.`,
			);
		}
		return this.copy({ kind, kindMeta: { ...this.kindMeta, ...meta } });
	}
}
