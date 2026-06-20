import {
	LocaleSwitcherBlock,
	LogoBlock,
	NavMenuBlock,
	SpacerBlock,
	UserMenuBlock,
} from "../app/chromeBlocks";
import { MediaLibraryBlock } from "../media/mediaLibraryBlock";
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
import { registerFields } from "./registerFields";

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
