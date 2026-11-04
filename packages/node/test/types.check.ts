import { type FormValues, S } from "../src";
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
