import { includes } from "../node";
import { collectAll } from "../walk";
import { Field } from "./field";

/** A block kind a richtext inserts as a card; its data is edited in a modal form (Embed.php). */
export class Embed {
	private labelValue: string | null = null;
	private iconValue: string | null = null;
	private summaryValue: string | null = null;
	private fieldList: unknown[] = [];

	private constructor(readonly kind: string) {}

	/** Starts an embed of the given kind — the `kind` written into every stored node. */
	static make(kind: string): Embed {
		if (kind === "") {
			throw new Error("An embed kind cannot be empty.");
		}
		return new Embed(kind);
	}

	/** Name on the card, in the insert menus and as the modal title; defaults to the kind. */
	label(label: string): this {
		this.labelValue = label;
		return this;
	}

	/** Icon on the card and in the insert menus. */
	icon(icon: string): this {
		this.iconValue = icon;
		return this;
	}

	/** Field whose value is the card's one-line summary. */
	summary(field: string): this {
		this.summaryValue = field;
		return this;
	}

	/** The modal form's fields; translatable() on them is ignored, embeds do not nest. */
	fields(fields: unknown[]): this {
		for (const field of collectAll(fields, (c) => c instanceof Field) as Field[]) {
			if (field instanceof Richtext && field.getEmbeds().length > 0) {
				throw new Error(
					`Richtext "${field.name}" declares embeds() inside an embed's fields; embeds do not nest.`,
				);
			}
			field.translatable(false);
		}
		this.fieldList = fields;
		return this;
	}

	labelText(): string {
		return this.labelValue ?? this.kind;
	}

	includedFields(): unknown[] {
		return this.fieldList.filter(includes);
	}

	toJSON(): Record<string, unknown> {
		return {
			kind: this.kind,
			label: this.labelText(),
			icon: this.iconValue,
			summary: this.summaryValue,
			fields: this.includedFields(),
		};
	}
}

/** Lexical rich-text editor; the value is the editor state (Richtext.php). */
export class Richtext<N extends string = string> extends Field<N, Record<string, unknown> | null> {
	readonly kind = "richtext";
	private embedList: Embed[] = [];
	private maxEmbedCount: number | null = null;

	/** Placeholder text shown in the empty editor. */
	placeholder(text: string): this {
		return this.set("placeholder", text);
	}

	/** Block kinds the editor inserts as cards; each validated against its fields on save. */
	embeds(embeds: Embed[]): this {
		const kinds = new Set<string>();
		for (const embed of embeds) {
			if (kinds.has(embed.kind)) {
				throw new Error(
					`Richtext "${this.name}": embed kind "${embed.kind}" is declared twice.`,
				);
			}
			kinds.add(embed.kind);
		}
		this.embedList = embeds;
		return this.set("embeds", embeds);
	}

	/** Server-side cap on embeds per document (at least 1). */
	maxEmbeds(max: number): this {
		if (max < 1) {
			throw new Error(`Richtext "${this.name}": maxEmbeds must be at least 1, got ${max}.`);
		}
		this.maxEmbedCount = max;
		return this;
	}

	getEmbeds(): Embed[] {
		return this.embedList;
	}

	getMaxEmbeds(): number | null {
		return this.maxEmbedCount;
	}

	/** Every included field of every embed; not the form's own fields. */
	embedFields(): unknown[] {
		return this.embedList.flatMap((embed) => embed.includedFields());
	}

	findEmbed(kind: string): Embed | null {
		return this.embedList.find((embed) => embed.kind === kind) ?? null;
	}
}
