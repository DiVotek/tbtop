import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderNode } from "../render/structureRenderer";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { CheckboxCell, CheckboxForm } from "./checkboxField";

describe("Checkbox field", () => {
	test("Checkbox renders a Radix Checkbox root with role=checkbox", async () => {
		const node = s.form({ query: async () => ({ agree: false }) }, [
			s.checkbox({ name: "agree", label: "I accept terms" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId, getAllByRole } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		expect(container.querySelector('[data-slot="checkbox"]')).not.toBeNull();
		expect(getAllByRole("checkbox").length).toBeGreaterThan(0);
	});

	test("Checkbox null initial value renders unchecked", () => {
		const { container } = render(
			<CheckboxForm name="agree" value={null} onChange={() => {}} />,
		);
		const root = container.querySelector('[data-slot="checkbox"]');
		expect(root?.getAttribute("data-state")).toBe("unchecked");
	});

	test("Checkbox true initial value renders checked", () => {
		const { container } = render(
			<CheckboxForm name="agree" value={true} onChange={() => {}} />,
		);
		const root = container.querySelector('[data-slot="checkbox"]');
		expect(root?.getAttribute("data-state")).toBe("checked");
	});

	test("Checkbox clicking emits true then false through onChange", async () => {
		const captured: (boolean | null)[] = [];
		const user = userEvent.setup();
		const { container, rerender } = render(
			<CheckboxForm
				name="agree"
				value={false}
				onChange={(next) => {
					captured.push(next);
				}}
			/>,
		);
		const root = container.querySelector('[data-slot="checkbox"]') as HTMLElement;
		await user.click(root);
		expect(captured.at(-1)).toBe(true);
		rerender(
			<CheckboxForm
				name="agree"
				value={true}
				onChange={(next) => {
					captured.push(next);
				}}
			/>,
		);
		await user.click(container.querySelector('[data-slot="checkbox"]') as HTMLElement);
		expect(captured.at(-1)).toBe(false);
	});

	test("CheckboxCell renders a checkmark for true and an em-dash for false", () => {
		const { container, rerender } = render(<CheckboxCell value={true} />);
		expect(container.textContent).toBe("✓");
		rerender(<CheckboxCell value={false} />);
		expect(container.textContent).toBe("—");
	});

	test("CheckboxCell renders nothing for null value", () => {
		const { container } = render(<CheckboxCell value={null} />);
		expect(container.textContent).toBe("");
	});
});
