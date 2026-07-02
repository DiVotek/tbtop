import {
	buildActionGroup,
	buildChart,
	buildCollapsible,
	buildSection,
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
import type { StructureBuilders } from "./structureBuilders.types";
import type { StructureNode } from "./types";

export type { FlexOpts, StructureBuilders } from "./structureBuilders.types";

export type {
	AsyncChoiceMulti,
	AsyncChoiceShared,
	AsyncChoiceSingle,
	CheckboxListOpts,
	ChoiceOption,
	ColorpickerOpts,
	DateOpts,
	DatetimeOpts,
	KeyvalueOpts,
	NumberOpts,
	OtpOpts,
	PasswordOpts,
	RadioOpts,
	RepeaterOpts,
	SelectAsyncMultiOpts,
	SelectAsyncSingleOpts,
	SelectOpts,
	SelectStaticMultiOpts,
	SelectStaticSingleOpts,
	SliderOpts,
	SlugOpts,
	TagsAsyncOpts,
	TagsClosedOrOpenOpts,
	TagsOpts,
	TextareaOpts,
	TextOpts,
	ToggleButtonsOpts,
	UploadOpts,
} from "./structureFieldOpts";

type Builder = (...args: unknown[]) => unknown;

const builtins: Record<string, Builder> = {
	stack: layoutChildrenFirst("stack") as Builder,
	row: layoutChildrenFirst("row") as Builder,
	flex: layoutChildrenFirst("flex") as Builder,
	grid: layoutOptsFirst("grid") as Builder,
	section: buildSection as Builder,
	collapsible: buildCollapsible as Builder,
	aside: layoutChildrenFirst("aside") as Builder,
	actionGroup: buildActionGroup as Builder,
	dropdown: ((label: string, actions: StructureNode[]) =>
		buildActionGroup(label, actions, "dropdown")) as Builder,
	tabs: buildTabs as Builder,
	tab: buildTab as Builder,
	table: buildTable as Builder,
	chart: buildChart as Builder,
	text: makeField("text") as Builder,
	textarea: makeField("textarea") as Builder,
	password: makeField("password") as Builder,
	otp: makeField("otp") as Builder,
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
	checkboxlist: makeField("checkboxlist") as Builder,
	togglebuttons: makeField("togglebuttons") as Builder,
	slider: makeField("slider") as Builder,
	widget: buildWidget as Builder,
};

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
