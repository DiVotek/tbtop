import { Affixes } from "./affix";
import { DatabaseRules, mixin, StringRules } from "./concerns";
import { Field } from "./field";

/** One placeholder, or one per content locale (HasLocalePlaceholder.php). */
export type LocalePlaceholder = string | Record<string, string>;

function checkedPlaceholder(text: LocalePlaceholder): LocalePlaceholder {
	if (typeof text === "string") {
		return text;
	}
	const valid =
		text !== null &&
		typeof text === "object" &&
		!Array.isArray(text) &&
		Object.values(text).every((v) => typeof v === "string");
	if (!valid) {
		throw new Error("A placeholder locale map needs locale keys and string values.");
	}
	return text;
}

/** Single-line text input (Text.php). */
export class Text<N extends string = string> extends Field<N, string | null> {
	readonly kind = "text";

	/** Fixed input mask: `9` digit, `a` letter, `*` alphanumeric, anything else literal. */
	mask(pattern: string): this {
		return this.set("mask", pattern);
	}

	/**
	 * Placeholder text shown in the empty input. Pass a locale map
	 * (`{ en: "Page title", uk: "Назва сторінки" }`) on a translatable field to
	 * show each locale's text on its own tab; a missing locale shows none.
	 */
	placeholder(text: LocalePlaceholder): this {
		return this.set("placeholder", checkedPlaceholder(text));
	}
}
export interface Text<N extends string = string> extends Affixes, DatabaseRules, StringRules {}
mixin(Text, [Affixes, DatabaseRules, StringRules]);

/** Multi-line text input (Textarea.php). */
export class Textarea<N extends string = string> extends Field<N, string | null> {
	readonly kind = "textarea";

	/** Placeholder text shown in the empty textarea; a locale map as on Text. */
	placeholder(text: LocalePlaceholder): this {
		return this.set("placeholder", checkedPlaceholder(text));
	}
}
export interface Textarea<N extends string = string> extends StringRules {}
mixin(Textarea, [StringRules]);

/** Masked password input (Password.php). */
export class Password<N extends string = string> extends Field<N, string | null> {
	readonly kind = "password";
}
export interface Password<N extends string = string> extends StringRules {}
mixin(Password, [StringRules]);

/** URL slug, generated from another field while typing (Slug.php). */
export class Slug<N extends string = string> extends Field<N, string | null> {
	readonly kind = "slug";

	/** Source field the slug derives from; `title.en` pins one locale. */
	fromField(fieldName: string): this {
		return this.set("fromField", fieldName);
	}
}
export interface Slug<N extends string = string> extends StringRules {}
mixin(Slug, [StringRules]);

/** One-time code slots (Otp.php). */
export class Otp<N extends string = string> extends Field<N, string | null> {
	readonly kind = "otp";

	/** Slot count; also a server `digits:N` rule, replaced on a second call. */
	length(digits = 6): this {
		this.set("length", digits);
		this.replaceRules(this.ruleEntries().filter((rule) => !rule.startsWith("digits:")));
		return this.rules(`digits:${digits}`);
	}

	/** Client-side accepted-character regex; defaults to digits-only. */
	pattern(regex: string): this {
		return this.set("pattern", regex);
	}
}
