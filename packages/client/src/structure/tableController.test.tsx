import { describe, expect, test } from "bun:test";
import { act, render } from "@testing-library/react";
import { useTableController } from "./tableController";

type Handle = ReturnType<typeof useTableController>;

interface ProbeInput {
	rows: unknown[];
	params: { page?: number };
	onChangeParams: (patch: Partial<{ page?: number }>) => void;
	onRefresh: () => void;
	onRender: (ctrl: Handle) => void;
}

function Probe({ rows, params, onChangeParams, onRefresh, onRender }: ProbeInput) {
	const ctrl = useTableController({
		rows,
		queryParams: params,
		onChangeParams,
		onRefresh,
	});
	onRender(ctrl);
	return null;
}

interface MountInput {
	rows: unknown[];
	params: { page?: number };
	onChangeParams?: (patch: Partial<{ page?: number }>) => void;
	onRefresh?: () => void;
}

function mount(input: MountInput): Handle[] {
	const captures: Handle[] = [];
	render(
		<Probe
			rows={input.rows}
			params={input.params}
			onChangeParams={input.onChangeParams ?? (() => {})}
			onRefresh={input.onRefresh ?? (() => {})}
			onRender={(c) => captures.push(c)}
		/>,
	);
	return captures;
}

function last(captures: Handle[]): Handle {
	const handle = captures[captures.length - 1];
	if (!handle) {
		throw new Error("test probe captured no controller");
	}
	return handle;
}

describe("useTableController", () => {
	test("TableController exposes rows, empty selectedIds, and current params", () => {
		const rows = [{ id: "r1" }, { id: "r2" }, { id: "r3" }];
		const captures = mount({ rows, params: { page: 1 } });
		const handle = last(captures);
		expect(handle.rows).toBe(rows);
		expect(handle.selectedIds).toEqual([]);
		expect(handle.queryParams).toEqual({ page: 1 });
	});

	test("TableController toggleSelection adds and removes ids", () => {
		const captures = mount({ rows: [{ id: "a" }, { id: "b" }], params: {} });
		act(() => last(captures).toggleSelection("a"));
		act(() => last(captures).toggleSelection("b"));
		expect(last(captures).selectedIds).toEqual(["a", "b"]);
		act(() => last(captures).toggleSelection("a"));
		expect(last(captures).selectedIds).toEqual(["b"]);
	});

	test("TableController setQuery forwards the patch to onChangeParams for parent merge", () => {
		const seen: Partial<{ page?: number }>[] = [];
		const captures = mount({
			rows: [],
			params: { page: 1 },
			onChangeParams: (patch) => seen.push(patch),
		});
		act(() => last(captures).setQuery({ page: 2 }));
		expect(seen).toEqual([{ page: 2 }]);
	});

	test("TableController refresh delegates to onRefresh", () => {
		let refreshCount = 0;
		const captures = mount({
			rows: [],
			params: {},
			onRefresh: () => {
				refreshCount += 1;
			},
		});
		act(() => last(captures).refresh());
		expect(refreshCount).toBe(1);
	});
});
