import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectForm } from "./selectField";

const CHOICES = [
	{ value: "apple", label: "Apple" },
	{ value: "banana", label: "Banana" },
	{ value: "cherry", label: "Cherry" },
];

describe("Select field — static searchable", () => {
	test("Select searchable: filter input appears when searchable is true", async () => {
		const { container } = render(
			<SelectForm
				name="fruit"
				value={null}
				onChange={() => {}}
				options={{ options: CHOICES, searchable: true }}
			/>,
		);
		await waitFor(() => {
			expect(container.querySelector('[data-testid="select-search-fruit"]')).not.toBeNull();
		});
	});

	test("Select searchable: typing filters options by label", async () => {
		const user = userEvent.setup();
		const { container } = render(
			<SelectForm
				name="fruit"
				value={null}
				onChange={() => {}}
				options={{ options: CHOICES, searchable: true }}
			/>,
		);
		const input = container.querySelector(
			'[data-testid="select-search-fruit"]',
		) as HTMLInputElement;
		expect(input).not.toBeNull();
		await user.type(input, "an");

		// "Banana" contains "an", "Apple" and "Cherry" do not
		await waitFor(() => {
			const visible = container.querySelectorAll('[data-testid="select-option-fruit"]');
			expect(visible.length).toBe(1);
			expect(visible[0]?.textContent).toContain("Banana");
		});
	});

	// NEW CONTRACT: list is closed by default; must open trigger first.
	test("Select searchable: options list is closed by default", () => {
		const { container } = render(
			<SelectForm
				name="fruit"
				value={null}
				onChange={() => {}}
				options={{ options: CHOICES, searchable: true }}
			/>,
		);
		const items = container.querySelectorAll('[data-testid="select-option-fruit"]');
		expect(items.length).toBe(0);
	});

	test("Select searchable: shows all options after opening", async () => {
		const user = userEvent.setup();
		const { container } = render(
			<SelectForm
				name="fruit"
				value={null}
				onChange={() => {}}
				options={{ options: CHOICES, searchable: true }}
			/>,
		);
		const trigger = container.querySelector(
			'[data-testid="select-search-fruit"]',
		) as HTMLElement;
		await user.click(trigger);
		await waitFor(() => {
			const items = container.querySelectorAll('[data-testid="select-option-fruit"]');
			expect(items.length).toBe(3);
		});
	});

	test("Select searchable: clicking an option selects it and closes the list", async () => {
		const user = userEvent.setup();
		const captured: (string | null)[] = [];
		const { container } = render(
			<SelectForm
				name="fruit"
				value={null}
				onChange={(v) => captured.push(v as string | null)}
				options={{ options: CHOICES, searchable: true }}
			/>,
		);
		const trigger = container.querySelector(
			'[data-testid="select-search-fruit"]',
		) as HTMLElement;
		await user.click(trigger);
		await waitFor(() => {
			expect(
				container.querySelectorAll('[data-testid="select-option-fruit"]').length,
			).toBeGreaterThan(0);
		});
		const options = container.querySelectorAll('[data-testid="select-option-fruit"]');
		await user.click(options[0] as HTMLElement);
		expect(captured.at(-1)).toBe("apple");
		await waitFor(() => {
			expect(container.querySelectorAll('[data-testid="select-option-fruit"]').length).toBe(
				0,
			);
		});
	});

	test("Select searchable: Escape key closes the options list", async () => {
		const user = userEvent.setup();
		const { container } = render(
			<SelectForm
				name="fruit"
				value={null}
				onChange={() => {}}
				options={{ options: CHOICES, searchable: true }}
			/>,
		);
		const trigger = container.querySelector(
			'[data-testid="select-search-fruit"]',
		) as HTMLElement;
		await user.click(trigger);
		await waitFor(() => {
			expect(
				container.querySelectorAll('[data-testid="select-option-fruit"]').length,
			).toBeGreaterThan(0);
		});
		await user.keyboard("{Escape}");
		await waitFor(() => {
			expect(container.querySelectorAll('[data-testid="select-option-fruit"]').length).toBe(
				0,
			);
		});
	});

	test("Select non-searchable: no filter input rendered", () => {
		const { container } = render(
			<SelectForm
				name="fruit"
				value={null}
				onChange={() => {}}
				options={{ options: CHOICES }}
			/>,
		);
		expect(container.querySelector('[data-testid="select-search-fruit"]')).toBeNull();
	});
});
