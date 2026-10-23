import { ActionBuilder } from "./action";
import {
	AlertBlock,
	DisplayImageBlock,
	DisplayKeyValueBlock,
	DisplayRichtextBlock,
	HtmlBlock,
	TextBlock,
} from "./blocks";
import { ChartBuilder, type ChartType } from "./chart";
import { DisplayValueBlock } from "./displayValue";
import { FieldKinds } from "./fieldKinds";
import { FormBuilder } from "./form";
import {
	checked,
	type FlexOpts,
	flexNode,
	type LayoutOpts,
	layout,
	type SectionOpts,
	sectionNode,
} from "./layout";
import { ListBuilder, ListItem } from "./list";
import { LiveRegion } from "./liveRegion";
import { MarkdownBlock } from "./markdown";
import { type Columns, validateColumns, validateGap } from "./meta";
import { mixin } from "./mixin";
import { Node } from "./node";
import { Registry } from "./registry";
import { Stat } from "./stat";
import { TableBuilder } from "./table/table";
import { type TabSpec, tabsNode } from "./tabs";

/**
 * The authoring surface (S.php), one instance per request: data builders
 * register by name so endpoints resolve their closures without serializing them.
 */
export class S extends Registry {
	/** Vertical flex container. */
	stack<const C extends readonly unknown[]>(children: C, opts: LayoutOpts = {}): Container<C> {
		return layout(
			"stack",
			[...children],
			checked("stack", opts, ["class", "gap"]),
		) as Container<C>;
	}

	/** Horizontal flex container. */
	row<const C extends readonly unknown[]>(children: C, opts: LayoutOpts = {}): Container<C> {
		return layout("row", [...children], checked("row", opts, ["class", "gap"])) as Container<C>;
	}

	/** Flex with explicit direction and alignment. */
	flex<const C extends readonly unknown[]>(children: C, opts: FlexOpts = {}): Container<C> {
		return flexNode([...children], opts) as Container<C>;
	}

	/** Grid: `cols` 1-8 or per breakpoint, `gap` 0-12. */
	grid<const C extends readonly unknown[]>(
		opts: LayoutOpts & { cols?: Columns },
		children: C,
	): Container<C> {
		const raw = checked("grid", opts, ["cols", "gap", "class"]);
		if (opts.cols !== undefined) {
			validateColumns(opts.cols, "grid cols");
		}
		if (opts.gap !== undefined) {
			validateGap(opts.gap, "grid gap");
		}
		return layout("grid", [...children], raw) as Container<C>;
	}

	/** Card section: title, description, icon, aside, collapsible, columns, actions, url, variant. */
	section<const C extends readonly unknown[]>(opts: SectionOpts, children: C): Container<C> {
		return sectionNode(opts, [...children]) as Container<C>;
	}

	/** A section with a chevron toggle; needs a label. */
	collapsible<const C extends readonly unknown[]>(
		opts: LayoutOpts & { label: string; collapsed?: boolean },
		children: C,
	): Container<C> {
		const raw = checked("collapsible", opts, ["label", "collapsed"]);
		return layout("collapsible", [...children], { collapsed: false, ...raw }) as Container<C>;
	}

	/** Fixed-width side column, a sibling of the main content in a row. */
	aside<const C extends readonly unknown[]>(
		children: C,
		opts: Pick<LayoutOpts, "class" | "colSpan" | "colStart"> = {},
	): Container<C> {
		return layout("aside", [...children], checked("aside", opts, ["class"])) as Container<C>;
	}

	/** A button group or dropdown of actions. */
	actionGroup(label: string, actions: ActionBuilder[], as?: "buttons" | "dropdown"): Node {
		const options: Record<string, unknown> = { label, children: actions };
		if (as !== undefined) {
			options.as = as;
		}
		return new Node("actionGroup", options);
	}

	/** Actions always inside a menu. */
	dropdown(label: string, actions: ActionBuilder[]): Node {
		return this.actionGroup(label, actions, "dropdown");
	}

	/** Tab container; `name` in opts makes it addressable. */
	tabs<const T extends readonly TabSpec[]>(
		tabs: T,
		opts: LayoutOpts & { name?: string } = {},
	): Container<T> {
		return tabsNode([...tabs], opts) as Container<T>;
	}

	/** Static text; a heading is displayText(...).variant('heading'). */
	displayText(content: string): TextBlock {
		return new TextBlock(content);
	}

	/** Raw HTML, unsanitized. */
	displayHtml(rawHtml: string): HtmlBlock {
		return new HtmlBlock(rawHtml);
	}

	/** Markdown rendered server-side; embedded HTML escaped unless allowHtml(). */
	markdown(content: string): MarkdownBlock {
		return new MarkdownBlock(content);
	}

	/** Horizontal rule. */
	displayDivider(): Node {
		return new Node("displayDivider");
	}

	/** Inline alert/callout. */
	displayAlert(message: string): AlertBlock {
		return new AlertBlock(message);
	}

	/** One read-only value, formatted like a table column. */
	displayValue(value: unknown): DisplayValueBlock {
		return new DisplayValueBlock(value);
	}

	/** Read-only image, or a download link via asLink(). */
	displayImage(src: string): DisplayImageBlock {
		return new DisplayImageBlock(src);
	}

	/** Read-only Lexical state. */
	displayRichtext(state: Record<string, unknown>): DisplayRichtextBlock {
		return new DisplayRichtextBlock(state);
	}

	/** Read-only key/value pairs. */
	displayKeyValue(map: Record<string, unknown>): DisplayKeyValueBlock {
		return new DisplayKeyValueBlock(map);
	}

	/** Sidebar navigation from the panel pages. */
	navMenu(): Node {
		return new Node("navMenu");
	}

	/** Profile dropdown; `{locales: false}` hides its language section. */
	userMenu(opts: { locales?: boolean } = {}): Node {
		return new Node("userMenu", opts);
	}

	/** Panel brand text. */
	logo(): Node {
		return new Node("logo");
	}

	/** UI-locale switcher: 'buttons' (default) or 'dropdown'. */
	localeSwitcher(variant?: "buttons" | "dropdown"): Node {
		return new Node("localeSwitcher", variant === undefined ? {} : { variant });
	}

	/** Pushes the following siblings to the far edge. */
	spacer(): Node {
		return new Node("spacer");
	}

	/** "Unsaved changes" marker of the enclosing form. */
	unsavedIndicator(label?: string): Node {
		return new Node("unsavedIndicator", label === undefined ? {} : { label });
	}

	/** Header notifications bell. */
	notifications(): Node {
		return new Node("notifications");
	}

	/** Light → dark → system toggle. */
	themeToggle(): Node {
		return new Node("themeToggle");
	}

	/** A form, registered by name. */
	form<const C extends readonly unknown[]>(name: string, children: C): FormBuilder<C> {
		return this.register("forms", name, new FormBuilder(name, children));
	}

	/** A table, registered by name; `Q` is the host's query type. */
	table<Q = unknown>(name: string): TableBuilder<Q> {
		const table = new TableBuilder<Q>(name);
		this.register("tables", name, table as unknown as TableBuilder);
		return table;
	}

	/** A KPI tile, registered by label. */
	stat(label: string): Stat {
		return this.register("stats", label, new Stat(label));
	}

	/** A row list widget. */
	list(name: string): ListBuilder {
		return new ListBuilder(name);
	}

	/** Fluent row for list().items(). */
	listItem(title: string): ListItem {
		return new ListItem(title);
	}

	/** A chart, registered by name. */
	chart(name: string, type: ChartType, opts: Record<string, unknown> = {}): ChartBuilder {
		return this.register("charts", name, new ChartBuilder(name, type, opts));
	}

	/** An action, registered by name. */
	action(name: string): ActionBuilder {
		return this.register("actions", name, new ActionBuilder(name));
	}

	/** A server-rendered region inside a form, re-rendered on field changes. */
	liveRegion(name: string): LiveRegion {
		return new LiveRegion(name);
	}

	/** Standalone action buttons; 'grid' lays them out as cards. */
	actionsRow(actions: ActionBuilder[], opts: { variant?: "grid" } = {}): Node {
		const options: Record<string, unknown> = { children: actions };
		if (opts.variant !== undefined) {
			if (opts.variant !== "grid") {
				throw new Error(
					`Invalid actionsRow variant "${String(opts.variant)}". Allowed: grid.`,
				);
			}
			options.variant = opts.variant;
		}
		return new Node("row", options);
	}
}
export interface S extends FieldKinds {}
mixin(S, [FieldKinds]);

/** A layout node that remembers its children's types, so forms can infer values. */
export type Container<C> = Node & { readonly __children: C };
