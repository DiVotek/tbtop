import { type FormValues, type LocalizedFormValues, S, type Translations } from "../src";
import { type MemoryQuery, memoryQuery } from "../src/adapters/memory";

const s = new S();

// Compile-time only: the form payload is inferred from the fields, sections included.
const form = s.form("post", [
	s.section({ title: "A" }, [s.text("title").required(), s.textarea("body")]),
	s
		.select("status")
		.options([
			{ value: "draft", label: "Draft" },
			{ value: "live", label: "Live" },
		] as const)
		.required(),
	s.boolean("published"),
	s.number("views"),
	s.actionsRow([s.action("save").submit()]),
]);

type Expected = {
	title: string;
	body: string | null;
	status: "draft" | "live";
	published: boolean;
	views: number | null;
};
type Payload = FormValues<typeof form.children>;
const exact: [Payload, Expected] extends [Expected, Payload] ? true : false = true;
void exact;

form.onSubmit(({ form: values }) => {
	values.title.toUpperCase();
	// @ts-expect-error body may be null
	values.body.toUpperCase();
	// @ts-expect-error unknown key
	void values.nope;
});

// Compile-time only: a table's query types its tabs and filters.
s.table("posts")
	.query(() => memoryQuery(() => []))
	.columns({ title: "Title" })
	.tabs((tab) => [
		tab("all"),
		tab("live").query((q) => ({ ...q, filters: [...q.filters, (r) => r.live === true] })),
		// @ts-expect-error a tab scope returns the table's query type
		tab("bad").query(() => 1),
	]);

s.select("status").filterUsing((q: MemoryQuery, value: string) => ({
	...q,
	filters: [...q.filters, (r) => r.status === value],
}));

// Compile-time only: required/translatable/multiple shape the value in any call order,
// and a repeater's rows are typed from its fields.
type Same<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

const shaped = s.form("shaped", [
	s.text("title").translatable(),
	s.text("name").translatable().required(),
	s.text("slug").required().translatable(),
	s.text("plain").translatable(false),
	s.select("tags").multiple(),
	s
		.select("sizes")
		.options([
			{ value: "s", label: "S" },
			{ value: "m", label: "M" },
		] as const)
		.multiple()
		.required(),
	s.select("one").multiple(false),
	s.togglebuttons("modes").multiple(),
	s.togglebuttons("mode"),
	s.upload("gallery").multiple(),
	s.upload("cover"),
	s.media("images").multiple(),
	s.repeater("faq").fields([s.text("q").required(), s.textarea("a")]),
	s
		.repeater("steps")
		.required()
		.fields([s.text("label").required(), s.repeater("items").fields([s.number("qty")])]),
	s
		.repeater("blurbs")
		.translatable()
		.fields([s.text("body").required()]),
	s.repeater("loose"),
]);

type ShapedExpected = {
	title: Translations<string | null> | null;
	name: Translations<string | null>;
	slug: Translations<string | null>;
	plain: string | null;
	tags: string[] | null;
	sizes: ("s" | "m")[];
	one: string | null;
	modes: string[] | null;
	mode: string | null;
	gallery: string[] | null;
	cover: string | null;
	images: (string | number)[] | null;
	faq: { q: string; a: string | null }[] | null;
	steps: { label: string; items: { qty: number | null }[] | null }[];
	blurbs: { body: Translations<string | null> }[] | null;
	loose: Record<string, unknown>[] | null;
};
const shapedExact: Same<FormValues<typeof shaped.children>, ShapedExpected> = true;
void shapedExact;

// Compile-time only: a translatable value maps back to its field value, a keyvalue does not.
type Untranslated<T> = T extends Translations<infer V> ? V : T;
const branded = s.form("branded", [
	s.text("title").translatable().required(),
	s.keyvalue("attrs"),
	s.repeater("items").fields([s.text("label").required()]),
]);
type Branded = FormValues<typeof branded.children>;
const untranslated: Same<Untranslated<Branded["title"]>, string | null> = true;
const plainRecord: Same<Untranslated<Branded["attrs"]>, Record<string, string> | null> = true;
const rows: Same<Branded["items"], { label: string }[] | null> = true;
void [untranslated, plainRecord, rows];
// Plain data still fits record(): the brand is phantom.
branded.record({ title: { en: "Hi", uk: null }, items: [{ label: "a" }] });
// A plain record is not a Translations value.
// @ts-expect-error the brand is required
const notTranslations: Translations<string> = { en: "x" };
void notTranslations;

// Compile-time only: one locale picked, translatable fields read as their field value.
const localized = s.form("localized", [
	s.text("title").translatable().required(),
	s.text("subtitle").translatable(),
	s.keyvalue("attrs"),
	s
		.repeater("faq")
		.translatable()
		.fields([s.text("q").required()]),
	s.select("tags").multiple().translatable(),
]);
type LocalizedExpected = {
	title: string;
	subtitle: string | null;
	attrs: Record<string, string> | null;
	faq: { q: string }[] | null;
	tags: string[] | null;
};
const localizedExact: Same<
	LocalizedFormValues<typeof localized.children>,
	LocalizedExpected
> = true;
void localizedExact;
