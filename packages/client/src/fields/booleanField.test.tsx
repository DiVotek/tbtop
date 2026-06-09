import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderNode } from "../render/structureRenderer";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { BooleanCell, BooleanForm } from "./booleanField";

describe("Boolean field", () => {
	test("Boolean renders a Radix Switch root with role=switch", async () => {
		const node = s.form({ query: async () => ({ published: false }) }, [
			s.boolean({ name: "published", label: "Published" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId, getByRole } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		expect(container.querySelector('[data-slot="switch"]')).not.toBeNull();
		expect(getByRole("switch")).toBeTruthy();
	});

	test("Boolean null initial value renders the switch in the off state", () => {
		const { container } = render(
			<BooleanForm name="published" value={null} onChange={() => {}} />,
		);
		const root = container.querySelector('[data-slot="switch"]');
		expect(root?.getAttribute("data-state")).toBe("unchecked");
	});

	test("Boolean false initial value renders the switch in the off state", () => {
		const { container } = render(
			<BooleanForm name="published" value={false} onChange={() => {}} />,
		);
		const root = container.querySelector('[data-slot="switch"]');
		expect(root?.getAttribute("data-state")).toBe("unchecked");
	});

	test("Boolean true initial value renders the switch in the on state", () => {
		const { container } = render(
			<BooleanForm name="published" value={true} onChange={() => {}} />,
		);
		const root = container.querySelector('[data-slot="switch"]');
		expect(root?.getAttribute("data-state")).toBe("checked");
	});

	test("Boolean clicking the switch emits true then false through onChange", async () => {
		const captured: (boolean | null)[] = [];
		const user = userEvent.setup();
		const { container, rerender } = render(
			<BooleanForm
				name="published"
				value={false}
				onChange={(next) => {
					captured.push(next);
				}}
			/>,
		);
		const root = container.querySelector('[data-slot="switch"]') as HTMLElement;
		await user.click(root);
		expect(captured.at(-1)).toBe(true);
		rerender(
			<BooleanForm
				name="published"
				value={true}
				onChange={(next) => {
					captured.push(next);
				}}
			/>,
		);
		await user.click(container.querySelector('[data-slot="switch"]') as HTMLElement);
		expect(captured.at(-1)).toBe(false);
	});

	test("BooleanCell renders a checkmark for true and an em-dash for false", () => {
		const { container, rerender } = render(<BooleanCell value={true} />);
		expect(container.textContent).toBe("✓");
		rerender(<BooleanCell value={false} />);
		expect(container.textContent).toBe("—");
	});

	test("BooleanCell renders nothing for null value", () => {
		const { container } = render(<BooleanCell value={null} />);
		expect(container.textContent).toBe("");
	});
});
