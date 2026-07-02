import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderNode } from "../render/structureRenderer";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { RadioCell, RadioForm } from "./radioField";

const CHOICES = [
	{ value: "free", label: "Free" },
	{ value: "pro", label: "Pro" },
];

describe("Radio field", () => {
	test("Radio renders a radio-group root with one item per option", async () => {
		const node = s.form({ query: async () => ({ plan: null }) }, [
			s.radio({ name: "plan", label: "Plan", options: CHOICES }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		expect(container.querySelector('[data-slot="radio-group"]')).not.toBeNull();
		expect(container.querySelectorAll('[data-slot="radio-group-item"]').length).toBe(2);
	});

	test("Radio null initial value leaves no item selected", () => {
		const { container } = render(
			<RadioForm
				name="plan"
				value={null}
				onChange={() => {}}
				options={{ options: CHOICES }}
			/>,
		);
		const items = container.querySelectorAll('[data-slot="radio-group-item"]');
		for (const it of items) {
			expect(it.getAttribute("data-state")).toBe("unchecked");
		}
	});

	test("Radio clicking emits value through onChange and switching emits the other", async () => {
		const captured: (string | null)[] = [];
		const user = userEvent.setup();
		const { container, rerender } = render(
			<RadioForm
				name="plan"
				value={null}
				onChange={(next) => {
					captured.push(next);
				}}
				options={{ options: CHOICES }}
			/>,
		);
		const items = container.querySelectorAll('[data-slot="radio-group-item"]');
		await user.click(items[0] as HTMLElement);
		expect(captured.at(-1)).toBe("free");
		rerender(
			<RadioForm
				name="plan"
				value="free"
				onChange={(next) => {
					captured.push(next);
				}}
				options={{ options: CHOICES }}
			/>,
		);
		const items2 = container.querySelectorAll('[data-slot="radio-group-item"]');
		await user.click(items2[1] as HTMLElement);
		expect(captured.at(-1)).toBe("pro");
	});

	test("RadioCell renders the label for the matching value", () => {
		const { container } = render(<RadioCell value="pro" options={{ options: CHOICES }} />);
		expect(container.textContent).toBe("Pro");
	});

	test("RadioCell falls back to the raw value when no option matches", () => {
		const { container } = render(
			<RadioCell value="enterprise" options={{ options: CHOICES }} />,
		);
		expect(container.textContent).toBe("enterprise");
	});

	test("RadioCell renders nothing for a null value", () => {
		const { container } = render(<RadioCell value={null} options={{ options: CHOICES }} />);
		expect(container.textContent).toBe("");
	});

	test("renders per-option description text", () => {
		const choices = [
			{ value: "low", label: "Low", description: "No rush" },
			{ value: "high", label: "High", description: "Time sensitive" },
		];
		const { getByText } = render(
			<RadioForm
				name="priority"
				value={null}
				onChange={() => {}}
				options={{ options: choices }}
			/>,
		);
		expect(getByText("No rush")).toBeTruthy();
		expect(getByText("Time sensitive")).toBeTruthy();
	});

	test("inline:true renders a horizontal row layout instead of the stacked grid", () => {
		const { container } = render(
			<RadioForm
				name="plan"
				value={null}
				onChange={() => {}}
				options={{ options: CHOICES, inline: true }}
			/>,
		);
		const group = container.querySelector('[data-slot="radio-group"]') as HTMLElement;
		expect(group.className).toContain("flex-row");
		expect(group.className).not.toContain("grid");
	});

	test("without inline, the group keeps the default stacked grid layout", () => {
		const { container } = render(
			<RadioForm
				name="plan"
				value={null}
				onChange={() => {}}
				options={{ options: CHOICES }}
			/>,
		);
		const group = container.querySelector('[data-slot="radio-group"]') as HTMLElement;
		expect(group.className).toContain("grid");
	});

	test("a per-option disabled:true disables only that item, not its siblings", () => {
		const choices = [
			{ value: "free", label: "Free" },
			{ value: "pro", label: "Pro", disabled: true },
		];
		const { container } = render(
			<RadioForm
				name="plan"
				value={null}
				onChange={() => {}}
				options={{ options: choices }}
			/>,
		);
		const items = container.querySelectorAll('[data-slot="radio-group-item"]');
		expect((items[0] as HTMLButtonElement).disabled).toBe(false);
		expect((items[1] as HTMLButtonElement).disabled).toBe(true);
	});
});
