/**
 * StructureBuilders interface + supporting types. Extracted from structure.ts
 * to keep that file within the 200-line limit.
 */
import type { ComponentType } from "react";
import type { IconDef } from "../ui/node-icon";
import type { ChartBlockOptions, ChartPoint } from "./chartBlock";
import type { ColumnsSpec } from "./columnsSpec";
import type {
	CheckboxListOpts,
	ColorpickerOpts,
	DateOpts,
	DatetimeOpts,
	FieldName,
	KeyvalueOpts,
	NumberOpts,
	OtpOpts,
	PasswordOpts,
	RadioOpts,
	RepeaterOpts,
	SelectOpts,
	SliderOpts,
	SlugOpts,
	TagsOpts,
	TextareaOpts,
	TextOpts,
	ToggleButtonsOpts,
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

/** Options for the standalone flex layout node (kind: "flex"). */
export type FlexOpts = {
	direction: "row" | "col";
	justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
	align?: "start" | "center" | "end" | "stretch" | "baseline";
	gap?: number;
	wrap?: boolean;
};

type FieldInputFor<TForm, TExtra> = NodeMeta & TExtra & { name: FieldName<TForm> };

export interface StructureBuilders<TForm = unknown> {
	stack: (children: StructureNode[], opts?: NodeMeta & { gap?: number }) => StructureNode;
	/** variant "grid": each child renders in a bordered, hoverable grid cell instead of a flex row. */
	row: (
		children: StructureNode[],
		opts?: NodeMeta & { gap?: number; variant?: "grid" },
	) => StructureNode;
	flex: (children: StructureNode[], opts?: NodeMeta & FlexOpts) => StructureNode;
	grid: (opts: NodeMeta & { cols?: ColumnsSpec }, children: StructureNode[]) => StructureNode;
	section: (
		opts: NodeMeta & {
			title?: string;
			description?: string;
			icon?: string | IconDef;
			aside?: StructureNode;
			action?: { label: string; url: string };
			collapsible?: boolean;
			collapsed?: boolean;
			columns?: ColumnsSpec;
		},
		children: StructureNode[],
	) => StructureNode;
	tabs: (tabs: TabItem[], opts?: NodeMeta) => StructureNode;
	tab: (
		label: string,
		body: StructureNode,
		opts?: { icon?: string | { name: string; position?: string }; badge?: string | number },
	) => TabItem;
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
	otp: (input: FieldInputFor<TForm, OtpOpts>) => StructureNode;
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
	checkboxlist: (input: FieldInputFor<TForm, CheckboxListOpts>) => StructureNode;
	togglebuttons: (input: FieldInputFor<TForm, ToggleButtonsOpts>) => StructureNode;
	slider: (input: FieldInputFor<TForm, SliderOpts>) => StructureNode;
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
	dropdown: (label: string, actions: StructureNode[]) => StructureNode;
}
