import {
	LocaleSwitcherBlock,
	LogoBlock,
	NavMenuBlock,
	SpacerBlock,
	UserMenuBlock,
} from "../app/chromeBlocks";
import { BooleanCell, BooleanForm } from "../fields/booleanField";
import { CheckboxCell, CheckboxForm } from "../fields/checkboxField";
import { ColorpickerCell, ColorpickerForm } from "../fields/colorpickerField";
import { DateCell, DateForm, DateTimeCell, DateTimeForm, TimeForm } from "../fields/dateField";
import { DaterangeForm, type DaterangeValue } from "../fields/daterangeField";
import { JsonCell, JsonForm } from "../fields/jsonField";
import { KeyvalueCell, KeyvalueForm } from "../fields/keyvalueField";
import { NumberCell, NumberForm } from "../fields/numberField";
import { PasswordCell, PasswordForm } from "../fields/passwordField";
import { RadioCell, RadioForm } from "../fields/radioField";
import { RelationCell, RelationForm } from "../fields/relationField";
import { RepeaterCell, RepeaterForm } from "../fields/repeaterField";
import { RichtextCell, type RichtextValue } from "../fields/richtext/richtextCell";
import { RichtextFormLazy } from "../fields/richtext/richtextFormLazy";
import { SelectCell, SelectForm } from "../fields/selectField";
import { SlugCell, SlugForm } from "../fields/slugField";
import { TagsCell, TagsForm } from "../fields/tagsField";
import { TextareaCell, TextareaForm } from "../fields/textareaField";
import { TextCell, TextForm } from "../fields/textField";
import { UnknownCell, UnknownForm } from "../fields/unknownField";
import { UploadCell, UploadForm, type UploadValue } from "../fields/uploadField";
import { MediaLibraryBlock } from "../media/mediaLibraryBlock";
import { MediaPickerCell, MediaPickerForm, type MediaPickerValue } from "../media/mediaPickerField";
import { ActionBlock } from "../structure/actionBlock";
import { ActionGroupBlock } from "../structure/actionGroupBlock";
import { AsideBlock } from "../structure/asideBlock";
import { createChartBlock } from "../structure/chartBlock";
import { CollapsibleBlock } from "../structure/collapsibleBlock";
import { DisplayAlertBlock } from "../structure/displayAlertBlock";
import { DisplayDividerBlock } from "../structure/displayDividerBlock";
import { DisplayHtmlBlock } from "../structure/displayHtmlBlock";
import { DisplayTextBlock } from "../structure/displayTextBlock";
import { FormBlock } from "../structure/formBlock";
import { TableBlock } from "../structure/tableBlock";
import {
	renderAreaChart,
	renderBarChart,
	renderDonutChart,
	renderLineChart,
	renderPieChart,
	StatBlock,
} from "../ui/charts";
import { getBlockDescriptor } from "./blockRegistry";
import {
	FlexBlock,
	GridBlock,
	RowBlock,
	SectionBlock,
	StackBlock,
	TabsBlock,
	WidgetBlock,
} from "./builtinLayoutBlocks";
import { defineBlock } from "./defineBlock";
import { defineFieldClient } from "./defineFieldClient";

// Gate on the registry Map, not a boolean — a stale flag and a cleared
// Map desync and leave renders empty (test isolation bug).
export function ensureBuiltinsRegistered(): void {
	if (getBlockDescriptor("form")) {
		return;
	}
	registerLayout();
	registerChrome();
	registerDataBlocks();
	registerCharts();
	registerFields();
}

// Shell chrome kinds — option-less; they read shared-prop data from
// ChromeDataContext (provided by AdminLayoutShell).
function registerChrome(): void {
	defineBlock("navMenu", { behavior: "leaf", render: NavMenuBlock });
	defineBlock("userMenu", { behavior: "leaf", render: UserMenuBlock });
	defineBlock("logo", { behavior: "leaf", render: LogoBlock });
	defineBlock("localeSwitcher", { behavior: "leaf", render: LocaleSwitcherBlock });
	defineBlock("spacer", { behavior: "leaf", render: SpacerBlock });
}

function registerLayout(): void {
	defineBlock("stack", { behavior: "container", render: StackBlock });
	defineBlock("row", { behavior: "container", render: RowBlock });
	defineBlock("flex", { behavior: "container", render: FlexBlock });
	defineBlock("grid", { behavior: "container", render: GridBlock });
	defineBlock("section", { behavior: "container", render: SectionBlock });
	defineBlock("tabs", { behavior: "container", render: TabsBlock });
	defineBlock("collapsible", { behavior: "container", render: CollapsibleBlock });
	defineBlock("aside", { behavior: "container", render: AsideBlock });
	defineBlock("actionGroup", { behavior: "leaf", render: ActionGroupBlock });
	defineBlock("widget", { behavior: "leaf", render: WidgetBlock });
	defineBlock("displayText", { behavior: "leaf", render: DisplayTextBlock });
	defineBlock("displayHtml", { behavior: "leaf", render: DisplayHtmlBlock });
	defineBlock("displayDivider", { behavior: "leaf", render: DisplayDividerBlock });
	defineBlock("displayAlert", { behavior: "leaf", render: DisplayAlertBlock });
}

function registerDataBlocks(): void {
	defineBlock("form", { behavior: "container", render: FormBlock });
	defineBlock("table", { behavior: "leaf", render: TableBlock });
	defineBlock("action", { behavior: "leaf", render: ActionBlock });
	defineBlock("mediaLibrary", { behavior: "leaf", render: MediaLibraryBlock });
	defineBlock("stat", { behavior: "leaf", render: StatBlock });
}

function registerCharts(): void {
	defineBlock("chart:line", { behavior: "leaf", render: createChartBlock(renderLineChart) });
	defineBlock("chart:bar", { behavior: "leaf", render: createChartBlock(renderBarChart) });
	defineBlock("chart:area", { behavior: "leaf", render: createChartBlock(renderAreaChart) });
	defineBlock("chart:pie", { behavior: "leaf", render: createChartBlock(renderPieChart) });
	defineBlock("chart:donut", { behavior: "leaf", render: createChartBlock(renderDonutChart) });
}

function registerFields(): void {
	registerInputFields();
	registerChoiceFields();
	registerStructuredFields();
}

function registerInputFields(): void {
	defineFieldClient<"text", string>("text", { form: TextForm, cell: TextCell });
	defineFieldClient<"textarea", string>("textarea", {
		form: TextareaForm,
		cell: TextareaCell,
	});
	defineFieldClient<"password", string>("password", {
		form: PasswordForm,
		cell: PasswordCell,
	});
	defineFieldClient<"number", number>("number", { form: NumberForm, cell: NumberCell });
	defineFieldClient<"date", string>("date", { form: DateForm, cell: DateCell });
	defineFieldClient<"datetime", string>("datetime", {
		form: DateTimeForm,
		cell: DateTimeCell,
	});
	defineFieldClient<"time", string>("time", { form: TimeForm, cell: DateCell });
	defineFieldClient<"daterange", DaterangeValue>("daterange", {
		form: DaterangeForm,
		cell: ({ value }) => (value ? `${value.from ?? ""} – ${value.to ?? ""}` : null),
	});
	defineFieldClient<"slug", string>("slug", { form: SlugForm, cell: SlugCell });
}

function registerChoiceFields(): void {
	defineFieldClient<"boolean", boolean>("boolean", { form: BooleanForm, cell: BooleanCell });
	defineFieldClient<"checkbox", boolean>("checkbox", {
		form: CheckboxForm,
		cell: CheckboxCell,
	});
	defineFieldClient<"select", string | string[]>("select", {
		form: SelectForm,
		cell: SelectCell,
	});
	defineFieldClient<"radio", string>("radio", { form: RadioForm, cell: RadioCell });
	defineFieldClient<"tags", string[]>("tags", { form: TagsForm, cell: TagsCell });
	defineFieldClient<"colorpicker", string>("colorpicker", {
		form: ColorpickerForm,
		cell: ColorpickerCell,
	});
	defineFieldClient<"relation", string>("relation", {
		form: RelationForm,
		cell: RelationCell,
	});
}

function registerStructuredFields(): void {
	defineFieldClient<"json", unknown>("json", { form: JsonForm, cell: JsonCell });
	defineFieldClient<"keyvalue", Record<string, string>>("keyvalue", {
		form: KeyvalueForm,
		cell: KeyvalueCell,
	});
	defineFieldClient<"upload", UploadValue>("upload", { form: UploadForm, cell: UploadCell });
	defineFieldClient<"media", MediaPickerValue>("media", {
		form: MediaPickerForm,
		cell: MediaPickerCell,
	});
	defineFieldClient<"repeater", Record<string, unknown>[]>("repeater", {
		form: RepeaterForm,
		cell: RepeaterCell,
	});
	defineFieldClient<"richtext", RichtextValue>("richtext", {
		form: RichtextFormLazy,
		cell: RichtextCell,
	});
	defineFieldClient<"unknown", unknown>("unknown", { form: UnknownForm, cell: UnknownCell });
}
