import type { ComponentType } from "react";
import {
	buildActionGroup,
	buildChart,
	buildCollapsible,
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
	ColorpickerOpts,
	DateOpts,
	DatetimeOpts,
	FieldName,
	KeyvalueOpts,
	NumberOpts,
	PasswordOpts,
	RadioOpts,
	RepeaterOpts,
	SelectOpts,
	SlugOpts,
	TagsOpts,
	TextareaOpts,
	TextOpts,
	UploadOpts,
} from "./structureFieldOpts";

export type {
	AsyncChoiceMulti,
	AsyncChoiceShared,
	AsyncChoiceSingle,
	ChoiceOption,
	ColorpickerOpts,
	DateOpts,
	DatetimeOpts,
	KeyvalueOpts,
	NumberOpts,
	PasswordOpts,
	RadioOpts,
	RepeaterOpts,
	SelectAsyncMultiOpts,
	SelectAsyncSingleOpts,
	SelectOpts,
	SelectStaticMultiOpts,
	SelectStaticSingleOpts,
	SlugOpts,
	TagsAsyncOpts,
	TagsClosedOrOpenOpts,
	TagsOpts,
	TextareaOpts,
	TextOpts,
	UploadOpts,
} from "./structureFieldOpts";

import type {
	ActionConfig,
	FormOptions,
	NodeMeta,
	StructureNode,
	TabItem,
	TableOptions,
} from "./types";

type Builder = (...args: unknown[]) => unknown;

/** Flex options accepted by row and stack layout nodes. */
export type FlexOpts = {
	gap?: number;
	justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
	align?: "start" | "center" | "end" | "stretch" | "baseline";
	wrap?: boolean;
};

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
};

type FieldInputFor<TForm, TExtra> = NodeMeta & TExtra & { name: FieldName<TForm> };

export interface StructureBuilders<TForm = unknown> {
	stack: (children: StructureNode[], opts?: NodeMeta & FlexOpts) => StructureNode;
	row: (children: StructureNode[], opts?: NodeMeta & FlexOpts) => StructureNode;
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
	repeater: (input: FieldInputFor<TForm, RepeaterOpts<StructureBuilders>>) => StructureNode;
	action: (config: ActionConfig<StructureBuilders>) => StructureNode;
	actions: (configs: ActionConfig<StructureBuilders>[]) => StructureNode;
	widget: <P>(opts: { component: ComponentType<P>; props?: P }) => StructureNode;
	collapsible: (
		opts: NodeMeta & { label: string; collapsed?: boolean },
		children: StructureNode[],
	) => StructureNode;
	aside: (children: StructureNode[], opts?: NodeMeta) => StructureNode;
	actionGroup: (
		label: string,
		actions: StructureNode[],
		as?: "buttons" | "dropdown",
	) => StructureNode;
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
