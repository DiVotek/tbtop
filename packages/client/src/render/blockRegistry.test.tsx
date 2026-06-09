import { afterEach, beforeEach, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { clearBlockRegistry, getBlockDescriptor, type RenderProps } from "./blockRegistry";
import { defineBlock } from "./defineBlock";
import { defineFieldClient } from "./defineFieldClient";
import { ensureBuiltinsRegistered } from "./registerBuiltins";
import { renderNode } from "./structureRenderer";

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

afterEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

test("Registry defineBlock stores a descriptor accessible by kind", () => {
	const Fx = () => <span>fx</span>;
	defineBlock("custom-fixture", { behavior: "leaf", render: Fx });
	const descriptor = getBlockDescriptor("custom-fixture");
	expect(descriptor?.kind).toBe("custom-fixture");
	expect(descriptor?.behavior).toBe("leaf");
	expect(descriptor?.render).toBe(Fx);
});

test("Registry last-write-wins replaces a prior descriptor for the same kind", () => {
	const First = () => <span data-testid="first">first</span>;
	const Second = () => <span data-testid="second">second</span>;
	defineBlock("custom-fixture", { behavior: "leaf", render: First });
	defineBlock("custom-fixture", { behavior: "leaf", render: Second });
	const node = { kind: "custom-fixture" } as never;
	const { getByTestId, queryByTestId } = render(renderNode(node));
	expect(getByTestId("second").textContent).toBe("second");
	expect(queryByTestId("first")).toBeNull();
});

test("Registry container behavior receives children and renderChild", () => {
	function ChildLeaf({ options }: RenderProps<{ label: string }>) {
		return <li>{options.label}</li>;
	}
	function ListContainer({ children, renderChild }: RenderProps<unknown>) {
		return (
			<ul data-testid="list">
				{children?.map((c, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: positional structure
					<span key={i}>{renderChild(c)}</span>
				))}
			</ul>
		);
	}
	defineBlock("list-fixture", { behavior: "container", render: ListContainer });
	defineBlock("list-leaf-fixture", { behavior: "leaf", render: ChildLeaf });
	const node = {
		kind: "list-fixture",
		children: [
			{ kind: "list-leaf-fixture", options: { label: "a" } },
			{ kind: "list-leaf-fixture", options: { label: "b" } },
		],
	} as never;
	const { getByTestId } = render(renderNode(node));
	expect(getByTestId("list").textContent).toBe("ab");
});

test("Registry field behavior dispatches form vs cell by ctx.surface", () => {
	function TestForm({ value }: { value: string | null }) {
		return <span data-testid="form-surface">form:{value ?? ""}</span>;
	}
	function TestCell({ value }: { value: string | null }) {
		return <span data-testid="cell-surface">cell:{value ?? ""}</span>;
	}
	defineFieldClient<"tags-fixture", string>("tags-fixture", { form: TestForm, cell: TestCell });
	const node = { kind: "tags-fixture", options: { name: "tags" } } as never;
	const ctxForm = {
		surface: "form" as const,
		binding: { name: "tags", value: "x", onChange: () => {} },
	};
	const ctxCell = {
		surface: "cell" as const,
		binding: { name: "tags", value: "y", onChange: () => {} },
	};
	const { getByTestId: form } = render(renderNode(node, ctxForm));
	expect(form("form-surface").textContent).toBe("form:x");
	const { getByTestId: cell } = render(renderNode(node, ctxCell));
	expect(cell("cell-surface").textContent).toBe("cell:y");
});

test("Registry defineFieldClient registers the same shape as a behavior:'field' defineBlock", () => {
	defineFieldClient<"tags-a", string>("tags-a", { form: () => null, cell: () => null });
	const descriptor = getBlockDescriptor("tags-a");
	expect(descriptor?.behavior).toBe("field");
});
