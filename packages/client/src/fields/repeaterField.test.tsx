import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { RepeaterCell, RepeaterForm } from "./repeaterField";

ensureBuiltinsRegistered();

type Item = Record<string, unknown>;

interface HarnessProps {
	initial: Item[] | null;
	options: {
		fields: { kind: string; name: string; options: Record<string, unknown>; meta: object }[];
		minItems?: number;
		maxItems?: number;
	};
	onEmit?: (v: Item[] | null) => void;
}

function Harness({ initial, options, onEmit }: HarnessProps) {
	const [value, setValue] = useState<Item[] | null>(initial);
	return (
		<RepeaterForm
			name="items"
			value={value}
			onChange={(next) => {
				setValue(next);
				onEmit?.(next);
			}}
			options={options as unknown as HarnessProps["options"]}
		/>
	);
}

const titleField = { kind: "text", name: "title", options: {}, meta: {} };
const qtyField = { kind: "number", name: "qty", options: {}, meta: {} };

describe("RepeaterForm", () => {
	test("renders one card per item", () => {
		const { container } = render(
			<Harness
				initial={[{ title: "a" }, { title: "b" }]}
				options={{ fields: [titleField] }}
			/>,
		);
		expect(container.querySelectorAll("[data-repeater-item]")).toHaveLength(2);
	});

	test("Add item appends an empty item", async () => {
		const user = userEvent.setup();
		const emits: (Item[] | null)[] = [];
		const { getByRole } = render(
			<Harness
				initial={[{ title: "a" }]}
				options={{ fields: [titleField] }}
				onEmit={(v) => emits.push(v)}
			/>,
		);
		await user.click(getByRole("button", { name: "Add item" }));
		expect(emits.at(-1)).toEqual([{ title: "a" }, { title: null }]);
	});

	test("Add item disabled at maxItems", () => {
		const { getByRole } = render(
			<Harness
				initial={[{ title: "a" }, { title: "b" }]}
				options={{ fields: [titleField], maxItems: 2 }}
			/>,
		);
		expect((getByRole("button", { name: "Add item" }) as HTMLButtonElement).disabled).toBe(
			true,
		);
	});

	test("Remove disabled when at minItems", () => {
		const { getAllByRole } = render(
			<Harness initial={[{ title: "a" }]} options={{ fields: [titleField], minItems: 1 }} />,
		);
		const remove = getAllByRole("button", { name: "Remove item" })[0] as HTMLButtonElement;
		expect(remove.disabled).toBe(true);
	});

	test("Remove drops the targeted item", async () => {
		const user = userEvent.setup();
		const emits: (Item[] | null)[] = [];
		const { getAllByRole } = render(
			<Harness
				initial={[{ title: "a" }, { title: "b" }, { title: "c" }]}
				options={{ fields: [titleField] }}
				onEmit={(v) => emits.push(v)}
			/>,
		);
		const removeButtons = getAllByRole("button", { name: "Remove item" });
		await user.click(removeButtons[1] as HTMLElement);
		expect(emits.at(-1)).toEqual([{ title: "a" }, { title: "c" }]);
	});

	test("Move Up swaps with previous", async () => {
		const user = userEvent.setup();
		const emits: (Item[] | null)[] = [];
		const { getAllByRole } = render(
			<Harness
				initial={[{ title: "a" }, { title: "b" }]}
				options={{ fields: [titleField] }}
				onEmit={(v) => emits.push(v)}
			/>,
		);
		const moveUps = getAllByRole("button", { name: "Move up" });
		await user.click(moveUps[1] as HTMLElement);
		expect(emits.at(-1)).toEqual([{ title: "b" }, { title: "a" }]);
	});

	test("Move Up disabled at index 0", () => {
		const { getAllByRole } = render(
			<Harness
				initial={[{ title: "a" }, { title: "b" }]}
				options={{ fields: [titleField] }}
			/>,
		);
		const moveUps = getAllByRole("button", { name: "Move up" });
		expect((moveUps[0] as HTMLButtonElement).disabled).toBe(true);
	});

	test("Move Down disabled at last index", () => {
		const { getAllByRole } = render(
			<Harness
				initial={[{ title: "a" }, { title: "b" }]}
				options={{ fields: [titleField] }}
			/>,
		);
		const moveDowns = getAllByRole("button", { name: "Move down" });
		const last = moveDowns[moveDowns.length - 1] as HTMLButtonElement;
		expect(last.disabled).toBe(true);
	});

	test("sub-field edit emits nested value at correct index", async () => {
		const user = userEvent.setup();
		const emits: (Item[] | null)[] = [];
		const { getAllByRole } = render(
			<Harness
				initial={[
					{ title: "a", qty: 1 },
					{ title: "b", qty: 2 },
				]}
				options={{ fields: [titleField, qtyField] }}
				onEmit={(v) => emits.push(v)}
			/>,
		);
		const inputs = getAllByRole("textbox") as HTMLInputElement[];
		await user.clear(inputs[0] as HTMLElement);
		await user.type(inputs[0] as HTMLElement, "z");
		const last = emits.at(-1) as Item[];
		expect(last[0]).toEqual({ title: "z", qty: 1 });
		expect(last[1]).toEqual({ title: "b", qty: 2 });
	});

	test("sub-field ids are scoped per item so labels target the right input", () => {
		const { container } = render(
			<Harness
				initial={[
					{ title: "a", qty: 1 },
					{ title: "b", qty: 2 },
				]}
				options={{ fields: [titleField, qtyField] }}
			/>,
		);
		const inputs = container.querySelectorAll("input");
		const ids = Array.from(inputs).map((i) => i.id);
		expect(new Set(ids).size).toBe(ids.length);
		const labels = container.querySelectorAll("label[for]");
		for (const label of labels) {
			const targetId = label.getAttribute("for") as string;
			expect(container.querySelector(`#${CSS.escape(targetId)}`)).toBeTruthy();
		}
	});
});

describe("RepeaterCell", () => {
	test("renders a summary for a non-empty array", () => {
		const { container } = render(<RepeaterCell value={[{ a: 1 }, { a: 2 }]} />);
		expect(container.textContent).toBe("2 items");
	});

	test("renders '1 item' singular", () => {
		const { container } = render(<RepeaterCell value={[{ a: 1 }]} />);
		expect(container.textContent).toBe("1 item");
	});

	test("renders nothing for null", () => {
		const { container } = render(<RepeaterCell value={null} />);
		expect(container.textContent).toBe("");
	});

	test("renders nothing for empty array", () => {
		const { container } = render(<RepeaterCell value={[]} />);
		expect(container.textContent).toBe("");
	});
});

describe("repeater via s.form integration", () => {
	test("s.repeater resolves the fields callback into StructureNode[] at build time", () => {
		const node = s.repeater({
			name: "items",
			fields: (sb) => [sb.text({ name: "title" })],
		});
		expect(node.kind).toBe("repeater");
		expect(node.name).toBe("items");
		const opts = node.options as { fields: { kind: string; name: string }[] };
		expect(opts.fields).toHaveLength(1);
		expect(opts.fields[0]?.kind).toBe("text");
		expect(opts.fields[0]?.name).toBe("title");
	});

	test("s.form + s.repeater renders end-to-end with label and items", async () => {
		const node = s.form(
			{
				query: async () => ({ items: [{ title: "Hello" }] }),
			},
			[
				s.repeater({
					name: "items",
					label: "Items",
					fields: (sb) => [sb.text({ name: "title" })],
				}),
			],
		);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		await waitFor(() =>
			expect(container.querySelectorAll("[data-repeater-item]").length).toBe(1),
		);
		const label = container.querySelector("label");
		expect(label?.textContent).toContain("Items");
	});
});
