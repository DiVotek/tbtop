import type { ComponentType, ReactNode } from "react";
import {
	buildActionGroup,
	buildAside,
	buildChart,
	buildCollapsible,
	buildDescription,
	buildDivider,
	buildHeading,
	buildTab,
	buildTable,
	buildTabs,
	buildWidget,
	layoutChildrenFirst,
	layoutOptsFirst,
	makeBuildForm,
	makeField,
	makeRepeaterField,
} from "./builders";
import { makeBuildAction, makeBuildActions } from "./builders.actions";
import type { ChartBlockOptions, ChartPoint } from "./chartBlock";
import type {
	ActionConfig,
	ClientActionContext,
	FormOptions,
	NodeMeta,
	StructureNode,
	TabItem,
	TableOptions,
} from "./types";

type Builder = (...args: unknown[]) => unknown;

const builtins: Record<string, Builder> = {
	stack: layoutChildrenFirst("stack") as Builder,
	row: layoutChildrenFirst("row") as Builder,
	grid: layoutOptsFirst("grid") as Builder,
	section: layoutOptsFirst("section") as Builder,
	collapsible: buildCollapsible as Builder,
	aside: layoutChildrenFirst("aside") as Builder,
	actionGroup: buildActionGroup as Builder,
	tabs: buildTabs as Builder,
	tab: buildTab as Builder,
	table: buildTable as Builder,
	chart: buildChart as Builder,
	text: makeField("text") as Builder,
	textarea: makeField("textarea") as Builder,
	password: makeField("password") as Builder,
	number: makeField("number") as Builder,
	date: makeField("date") as Builder,
	datetime: makeField("datetime") as Builder,
	boolean: makeField("boolean") as Builder,
	select: makeField("select") as Builder,
	radio: makeField("radio") as Builder,
	tags: makeField("tags") as Builder,
	checkbox: makeField("checkbox") as Builder,
	colorpicker: makeField("colorpicker") as Builder,
	keyvalue: makeField("keyvalue") as Builder,
	slug: makeField("slug") as Builder,
	upload: makeField("upload") as Builder,
	relation: makeField("relation") as Builder,
	repeater: makeField("repeater") as Builder,
	widget: buildWidget as Builder,
	divider: buildDivider as Builder,
	heading: buildHeading as Builder,
	description: buildDescription as Builder,
};

type FieldName<TForm> = TForm extends object ? Extract<keyof TForm, string> : string;

type FieldInputFor<TForm, TExtra> = NodeMeta & TExtra & { name: FieldName<TForm> };

interface TextOpts {
	label?: string;
	required?: boolean;
	maxLength?: number;
}

interface TextareaOpts {
	label?: string;
	required?: boolean;
	placeholder?: string;
	rows?: number;
	autoresize?: boolean;
}

interface PasswordOpts {
	label?: string;
	required?: boolean;
	placeholder?: string;
	autoComplete?: "current-password" | "new-password" | "off";
}

interface NumberOpts {
	label?: string;
	min?: number;
	max?: number;
	step?: number;
}

interface ChoiceOption {
	value: string;
	label: string;
}

interface DateOpts {
	label?: string;
	format?: string;
}

interface DatetimeOpts {
	label?: string;
	required?: boolean;
	placeholder?: string;
}

type ErrorSlot = ReactNode | ((err: Error) => ReactNode);

interface AsyncChoiceShared<TRow> {
	query: (ctx: ClientActionContext, search: string) => Promise<TRow[]>;
	optionLabel: (row: TRow) => string;
	optionValue: (row: TRow) => string;
	loading?: ReactNode;
	error?: ErrorSlot;
}

interface AsyncChoiceSingle<TRow> extends AsyncChoiceShared<TRow> {
	onLoad?: (ctx: ClientActionContext, value: string) => Promise<TRow>;
}

interface AsyncChoiceMulti<TRow> extends AsyncChoiceShared<TRow> {
	onLoad?: (ctx: ClientActionContext, values: string[]) => Promise<TRow[]>;
}

interface SelectStaticSingleOpts {
	label?: string;
	required?: boolean;
	options: ChoiceOption[];
	multiple?: false;
}

interface SelectStaticMultiOpts {
	label?: string;
	required?: boolean;
	options: ChoiceOption[];
	multiple: true;
}

interface SelectAsyncSingleOpts<TRow> extends AsyncChoiceSingle<TRow> {
	label?: string;
	required?: boolean;
	multiple?: false;
}

interface SelectAsyncMultiOpts<TRow> extends AsyncChoiceMulti<TRow> {
	label?: string;
	required?: boolean;
	multiple: true;
}

type SelectOpts<TRow = unknown> =
	| SelectStaticSingleOpts
	| SelectStaticMultiOpts
	| SelectAsyncSingleOpts<TRow>
	| SelectAsyncMultiOpts<TRow>;

interface RadioOpts {
	label?: string;
	required?: boolean;
	options: ChoiceOption[];
}

interface TagsClosedOrOpenOpts {
	label?: string;
	required?: boolean;
	options?: ChoiceOption[];
}

interface TagsAsyncOpts<TRow> extends AsyncChoiceMulti<TRow> {
	label?: string;
	required?: boolean;
}

type TagsOpts<TRow = unknown> = TagsClosedOrOpenOpts | TagsAsyncOpts<TRow>;

interface ColorpickerOpts {
	label?: string;
	required?: boolean;
	palette?: string[];
}

interface KeyvalueOpts {
	label?: string;
	required?: boolean;
}

interface SlugOpts {
	fromField: string;
	label?: string;
	required?: boolean;
}

interface UploadOpts {
	entity: string;
	label?: string;
	required?: boolean;
	accept?: string;
	maxFileSize?: number;
}

interface RepeaterOpts {
	fields: (s: StructureBuilders) => StructureNode[];
	label?: string;
	required?: boolean;
	minItems?: number;
	maxItems?: number;
}

export interface StructureBuilders<TForm = unknown> {
	stack: (children: StructureNode[], opts?: NodeMeta & { gap?: number }) => StructureNode;
	row: (children: StructureNode[], opts?: NodeMeta & { gap?: number }) => StructureNode;
	grid: (opts: NodeMeta & { cols: number }, children: StructureNode[]) => StructureNode;
	section: (opts: NodeMeta & { title?: string }, children: StructureNode[]) => StructureNode;
	tabs: (tabs: TabItem[], opts?: NodeMeta) => StructureNode;
	tab: (label: string, body: StructureNode) => TabItem;
	form: <TJson = TForm>(
		opts: NodeMeta & FormOptions,
		children: StructureNode[] | ((s: StructureBuilders<TJson>) => StructureNode[]),
	) => StructureNode;
	table: <TRow = unknown>(
		opts: NodeMeta & TableOptions<TRow, StructureBuilders>,
	) => StructureNode;
	chart: <TPoint extends ChartPoint = ChartPoint>(
		opts: NodeMeta & ChartBlockOptions<TPoint>,
	) => StructureNode;
	text: (input: FieldInputFor<TForm, TextOpts>) => StructureNode;
	textarea: (input: FieldInputFor<TForm, TextareaOpts>) => StructureNode;
	password: (input: FieldInputFor<TForm, PasswordOpts>) => StructureNode;
	number: (input: FieldInputFor<TForm, NumberOpts>) => StructureNode;
	date: (input: FieldInputFor<TForm, DateOpts>) => StructureNode;
	datetime: (input: FieldInputFor<TForm, DatetimeOpts>) => StructureNode;
	boolean: (input: FieldInputFor<TForm, { label?: string }>) => StructureNode;
	select: <TRow = unknown>(input: FieldInputFor<TForm, SelectOpts<TRow>>) => StructureNode;
	radio: (input: FieldInputFor<TForm, RadioOpts>) => StructureNode;
	tags: <TRow = unknown>(input: FieldInputFor<TForm, TagsOpts<TRow>>) => StructureNode;
	checkbox: (input: FieldInputFor<TForm, { label?: string }>) => StructureNode;
	colorpicker: (input: FieldInputFor<TForm, ColorpickerOpts>) => StructureNode;
	keyvalue: (input: FieldInputFor<TForm, KeyvalueOpts>) => StructureNode;
	slug: (input: FieldInputFor<TForm, SlugOpts>) => StructureNode;
	upload: (input: FieldInputFor<TForm, UploadOpts>) => StructureNode;
	relation: (input: FieldInputFor<TForm, { to: string; label?: string }>) => StructureNode;
	repeater: (input: FieldInputFor<TForm, RepeaterOpts>) => StructureNode;
	action: (config: ActionConfig<StructureBuilders>) => StructureNode;
	actions: (configs: ActionConfig<StructureBuilders>[]) => StructureNode;
	widget: <P>(opts: { component: ComponentType<P>; props?: P }) => StructureNode;
	divider: (opts?: NodeMeta) => StructureNode<"divider", Record<string, never>>;
	heading: (
		opts: NodeMeta & { text: string; level?: 2 | 3 | 4 },
	) => StructureNode<"heading", { text: string; level: 2 | 3 | 4 }>;
	description: (
		opts: NodeMeta & { text: string },
	) => StructureNode<"description", { text: string }>;
	collapsible: (
		opts: NodeMeta & { label: string; collapsed?: boolean },
		children: StructureNode[],
	) => StructureNode;
	aside: (children: StructureNode[], opts?: NodeMeta) => StructureNode;
	actionGroup: (label: string, actions: StructureNode[]) => StructureNode;
}

export type StructureBuilder = StructureBuilders;

export const s: StructureBuilder = new Proxy({} as StructureBuilder, {
	get(_target, prop) {
		if (typeof prop !== "string") {
			return;
		}
		return builtins[prop];
	},
}) as StructureBuilder;

export function registerStructureBuilder(kind: string, builder: Builder): void {
	builtins[kind] = builder;
}

export { makeField };

builtins.form = makeBuildForm(s) as Builder;
builtins.repeater = makeRepeaterField(s) as Builder;
builtins.action = makeBuildAction(s) as Builder;
builtins.actions = makeBuildActions(s) as Builder;

export type { ConditionContext, ConditionFn, NodeMeta, StructureNode, TabItem } from "./types";
