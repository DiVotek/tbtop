import { Action } from "./actions";
import { BooleanField, NumberField, Select, Slug, Text, Textarea } from "./fields";
import { Form } from "./form";
import { type Child, Container, compact, node, type WireNode } from "./node";
import { Column, Table } from "./table";

/**
 * The authoring surface (S.php). Field factories take the name as a literal
 * type so forms can infer their payload.
 */
export const s = {
	stack<const C extends readonly Child[]>(children: C): Container<C> {
		return new Container("stack", children);
	},

	row<const C extends readonly Child[]>(children: C): Container<C> {
		return new Container("row", children);
	},

	section<const C extends readonly Child[]>(
		title: string,
		children: C,
		opts: { description?: string; columns?: number; collapsible?: boolean } = {},
	): Container<C> {
		return new Container("section", children, compact({ title, ...opts }));
	},

	heading(content: string): WireNode {
		return node("displayText", { content, variant: "heading" });
	},

	textBlock(content: string, variant: "body" | "muted" | "subheading" = "body"): WireNode {
		return node("displayText", { content, variant });
	},

	text: <const N extends string>(name: N) => new Text(name),
	textarea: <const N extends string>(name: N) => new Textarea(name),
	slug: <const N extends string>(name: N) => new Slug(name),
	number: <const N extends string>(name: N) => new NumberField(name),
	boolean: <const N extends string>(name: N) => new BooleanField(name),
	select: <const N extends string>(name: N) => new Select(name),

	form<const C extends readonly Child[]>(name: string, children: C): Form<C> {
		return new Form(name, children);
	},

	action: (name: string) => new Action(name),
	table: (name: string) => new Table(name),
	column: (name: string) => new Column(name),
};

export type S = typeof s;
