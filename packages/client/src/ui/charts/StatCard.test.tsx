import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import type { StatDescriptor } from "./StatCard";
import { StatCard } from "./StatCard";

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
});
