/**
 * Chart and stat nodes gained hiddenIf/disabledIf via the PHP WithMeta trait.
 * Charts go through the dedicated materializeChart branch and stats through the
 * generic fallthrough — both must still compile meta.hiddenIf to a ConditionFn.
 */
import { describe, expect, it } from "bun:test";
import type { ConditionContext, StructureNode } from "../structure/types";
import { materialize } from "./materialize";

function serverNode(
	kind: string,
	options: Record<string, unknown>,
	name: string | undefined,
	meta: Record<string, unknown> = {},
): StructureNode {
	const base: Record<string, unknown> = { kind, options, meta };
	if (name !== undefined) {
		base.name = name;
	}
	return base as unknown as StructureNode;
}

const BASE = { basePath: "/admin/posts", data: {} };

describe("MaterializeNodeMeta: hiddenIf on chart and stat nodes", () => {
	it("MaterializeNodeMeta: chart node hiddenIf is compiled to a ConditionFn", () => {
		const chart = serverNode("chart:donut", { source: "byStatus", type: "donut" }, "byStatus", {
			hiddenIf: { op: "neq", field: "view", value: "status" },
		});

		const out = materialize(chart, BASE);
		const hiddenFn = out.meta?.hidden;
		if (typeof hiddenFn !== "function") {
			throw new TypeError("chart meta.hidden should be a compiled function");
		}

		const statusView: ConditionContext = {
			record: undefined,
			data: { view: "status" },
			user: null,
		};
		const otherView: ConditionContext = {
			record: undefined,
			data: { view: "trend" },
			user: null,
		};

		// view=status → not hidden; view!=status → hidden
		expect(hiddenFn(statusView)).toBe(false);
		expect(hiddenFn(otherView)).toBe(true);
	});

	it("MaterializeNodeMeta: stat node hiddenIf is compiled to a ConditionFn", () => {
		const stat = serverNode("stat", { label: "Revenue", value: 42 }, undefined, {
			hiddenIf: { op: "eq", field: "period", value: "all" },
		});

		const out = materialize(stat, BASE);
		const hiddenFn = out.meta?.hidden;
		if (typeof hiddenFn !== "function") {
			throw new TypeError("stat meta.hidden should be a compiled function");
		}

		const allPeriod: ConditionContext = {
			record: undefined,
			data: { period: "all" },
			user: null,
		};
		const monthPeriod: ConditionContext = {
			record: undefined,
			data: { period: "month" },
			user: null,
		};

		// period=all → hidden; period=month → not hidden
		expect(hiddenFn(allPeriod)).toBe(true);
		expect(hiddenFn(monthPeriod)).toBe(false);
	});
});
