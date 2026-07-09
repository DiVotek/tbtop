import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import type { StatDescriptor } from "./StatCard";
import { resolveSparklineColor, StatCard } from "./StatCard";

function renderStat(opts: StatDescriptor) {
	return render(<StatCard options={opts} />);
}

describe("StatCard", () => {
	test("renders label and value", () => {
		const { getByText } = renderStat({ label: "Revenue", value: "$12,400" });
		expect(getByText("Revenue")).toBeTruthy();
		expect(getByText("$12,400")).toBeTruthy();
	});

	test("renders description when provided", () => {
		const { getByText } = renderStat({
			label: "Users",
			value: 500,
			description: "vs last month",
		});
		expect(getByText("vs last month")).toBeTruthy();
	});

	test("omits description when absent", () => {
		const { queryByText } = renderStat({ label: "Users", value: 500 });
		expect(queryByText("vs last month")).toBeNull();
	});

	test("delta up: renders delta text with up direction attribute", () => {
		const { getByTestId, getByText } = renderStat({
			label: "MRR",
			value: 1000,
			delta: { text: "+8%", direction: "up" },
		});
		const badge = getByTestId("stat-delta");
		expect(badge.dataset["direction"]).toBe("up");
		expect(getByText("+8%")).toBeTruthy();
	});

	test("delta down: renders with down direction attribute", () => {
		const { getByTestId } = renderStat({
			label: "Churn",
			value: 5,
			delta: { text: "-3%", direction: "down" },
		});
		expect(getByTestId("stat-delta").dataset["direction"]).toBe("down");
	});

	test("delta flat: renders with flat direction attribute", () => {
		const { getByTestId } = renderStat({
			label: "Sessions",
			value: 500,
			delta: { text: "0%", direction: "flat" },
		});
		expect(getByTestId("stat-delta").dataset["direction"]).toBe("flat");
	});

	test("omits delta when absent", () => {
		const { queryByTestId } = renderStat({ label: "Views", value: 99 });
		expect(queryByTestId("stat-delta")).toBeNull();
	});

	test("renders sparkline container when sparkline data provided", () => {
		const { getByTestId } = renderStat({
			label: "Trend",
			value: 42,
			sparkline: [10, 20, 15, 30, 25],
		});
		expect(getByTestId("stat-sparkline")).toBeTruthy();
	});

	test("omits sparkline when not provided", () => {
		const { queryByTestId } = renderStat({ label: "Simple", value: 0 });
		expect(queryByTestId("stat-sparkline")).toBeNull();
	});

	test("omits sparkline when array is empty", () => {
		const { queryByTestId } = renderStat({ label: "Empty", value: 0, sparkline: [] });
		expect(queryByTestId("stat-sparkline")).toBeNull();
	});

	test("renders stat-card testid", () => {
		const { getByTestId } = renderStat({ label: "X", value: 1 });
		expect(getByTestId("stat-card")).toBeTruthy();
	});

	test("string value renders as-is", () => {
		const { getByText } = renderStat({ label: "Status", value: "Active" });
		expect(getByText("Active")).toBeTruthy();
	});

	// -------------------------------------------------------------------------
	// Header restyle: inline icon + uppercase label, single row
	// -------------------------------------------------------------------------

	test("header renders the label in uppercase-tracking style", () => {
		const { getByText } = renderStat({ label: "Pages", value: 22 });
		const title = getByText("Pages");
		expect(title.className).toContain("uppercase");
		expect(title.className).toContain("text-xs");
	});

	test("icon renders inline in the header (no colored circle wrapper)", () => {
		const { container } = renderStat({
			label: "Pages",
			value: 22,
			icon: { name: "file-text", position: "left" },
		});
		const icon = container.querySelector("svg");
		expect(icon).not.toBeNull();
		expect(icon?.classList.contains("h-4")).toBe(true);
		expect(container.querySelector(".rounded-full")).toBeNull();
	});

	test("omits the icon element when no icon is provided", () => {
		const { container } = renderStat({ label: "Pages", value: 22 });
		expect(container.querySelector("svg")).toBeNull();
	});

	// -------------------------------------------------------------------------
	// Sparkline position: inline (default) vs bottom (full-bleed)
	// -------------------------------------------------------------------------

	test("sparkline defaults to inline position when no position is given", () => {
		const { getByTestId } = renderStat({ label: "Trend", value: 42, sparkline: [1, 2, 3] });
		expect(getByTestId("stat-sparkline").dataset["position"]).toBeUndefined();
	});

	test("sparklinePosition 'bottom' renders the sparkline with data-position=bottom", () => {
		const { getByTestId } = renderStat({
			label: "Trend",
			value: 42,
			sparkline: [1, 2, 3],
			sparklinePosition: "bottom",
		});
		expect(getByTestId("stat-sparkline").dataset["position"]).toBe("bottom");
	});

	test("sparklinePosition 'bottom' renders exactly one sparkline (not both inline and bottom)", () => {
		const { getAllByTestId } = renderStat({
			label: "Trend",
			value: 42,
			sparkline: [1, 2, 3],
			sparklinePosition: "bottom",
		});
		expect(getAllByTestId("stat-sparkline")).toHaveLength(1);
	});

	test("sparklinePosition 'bottom' with no sparkline data renders no sparkline", () => {
		const { queryByTestId } = renderStat({
			label: "Trend",
			value: 42,
			sparklinePosition: "bottom",
		});
		expect(queryByTestId("stat-sparkline")).toBeNull();
	});

	// -------------------------------------------------------------------------
	// Colored description + trend arrow
	// -------------------------------------------------------------------------

	test("descriptionColor success renders the emerald text classes", () => {
		const { getByTestId } = renderStat({
			label: "Disk",
			value: "64.43 / 74.79 GB",
			description: "healthy",
			descriptionColor: "success",
		});
		const el = getByTestId("stat-description");
		expect(el.dataset["color"]).toBe("success");
		expect(el.className).toContain("text-emerald-600");
		expect(el.className).toContain("dark:text-emerald-400");
	});

	test("descriptionColor warning maps to amber", () => {
		const { getByTestId } = renderStat({
			label: "A",
			value: 1,
			description: "w",
			descriptionColor: "warning",
		});
		expect(getByTestId("stat-description").className).toContain("text-amber-600");
	});

	test("descriptionColor danger maps to red", () => {
		const { getByTestId } = renderStat({
			label: "B",
			value: 1,
			description: "d",
			descriptionColor: "danger",
		});
		expect(getByTestId("stat-description").className).toContain("text-red-600");
	});

	test("description without a color keeps the default muted style", () => {
		const { getByTestId } = renderStat({ label: "X", value: 1, description: "plain" });
		const el = getByTestId("stat-description");
		expect(el.dataset["color"]).toBeUndefined();
		expect(el.className).not.toContain("text-emerald-600");
	});

	test("trend up renders an arrow icon after the description", () => {
		const { getByTestId } = renderStat({
			label: "MRR",
			value: 1,
			description: "vs last week",
			trend: "up",
		});
		const arrow = getByTestId("stat-trend");
		expect(arrow.dataset["direction"]).toBe("up");
		// lives inside the description so it inherits the text color
		expect(getByTestId("stat-description").contains(arrow)).toBe(true);
	});

	test("trend down renders with down direction", () => {
		const { getByTestId } = renderStat({
			label: "Churn",
			value: 1,
			description: "vs last week",
			trend: "down",
		});
		expect(getByTestId("stat-trend").dataset["direction"]).toBe("down");
	});

	test("no trend renders no arrow", () => {
		const { queryByTestId } = renderStat({ label: "X", value: 1, description: "plain" });
		expect(queryByTestId("stat-trend")).toBeNull();
	});

	test("string values with separators render as-is", () => {
		const { getByText } = renderStat({ label: "Disk", value: "64.43 / 74.79 GB" });
		expect(getByText("64.43 / 74.79 GB")).toBeTruthy();
	});
});

describe("resolveSparklineColor", () => {
	test("maps semantic tokens to paintable colors", () => {
		expect(resolveSparklineColor("success", "fallback")).toBe("#10b981");
		expect(resolveSparklineColor("warning", "fallback")).toBe("#f59e0b");
		expect(resolveSparklineColor("danger", "fallback")).toBe("#ef4444");
		expect(resolveSparklineColor("primary", "fallback")).toBe("var(--primary)");
	});

	test("keeps the chart default when no token is given", () => {
		expect(resolveSparklineColor(undefined, "var(--chart-1)")).toBe("var(--chart-1)");
	});
});
