import { describe, expect, mock, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { ModalShell } from "../ui/modal-shell";
import { SelectForm } from "./selectField";
import type { SelectValueType } from "./selectShared";

const CHOICES = [
	{ value: "apple", label: "Apple" },
	{ value: "banana", label: "Banana" },
	{ value: "cherry", label: "Cherry" },
];

describe("Select field — static searchable", () => {
	test("a selected value hides the placeholder so the two never show at once", () => {
		const { getByTestId } = render(
			<SelectForm
				name="fruit"
				value="banana"
				onChange={() => {}}
				options={{ options: CHOICES, searchable: true }}
			/>,
		);
		const input = getByTestId("select-search-fruit") as HTMLInputElement;
		expect(input.placeholder).toBe("");
		expect(getByTestId("select-label-fruit").textContent).toBe("Banana");
	});

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
		const { getByTestId } = render(
			<SelectForm
				name="fruit"
				value={null}
				onChange={() => {}}
				options={{ options: CHOICES, searchable: true }}
			/>,
		);
		const input = getByTestId("select-search-fruit") as HTMLInputElement;
		await user.type(input, "an");

		// "Banana" contains "an", "Apple" and "Cherry" do not
		await waitFor(() => {
			const visible = document.querySelectorAll('[data-testid="select-option-fruit"]');
			expect(visible.length).toBe(1);
			expect(visible[0]?.textContent).toContain("Banana");
		});
	});

	// NEW CONTRACT: list is closed by default; must open trigger first.
	test("Select searchable: options list is closed by default", () => {
		render(
			<SelectForm
				name="fruit"
				value={null}
				onChange={() => {}}
				options={{ options: CHOICES, searchable: true }}
			/>,
		);
		const items = document.querySelectorAll('[data-testid="select-option-fruit"]');
		expect(items.length).toBe(0);
	});

	test("Select searchable: shows all options after opening", async () => {
		const user = userEvent.setup();
		const { getByTestId } = render(
			<SelectForm
				name="fruit"
				value={null}
				onChange={() => {}}
				options={{ options: CHOICES, searchable: true }}
			/>,
		);
		await user.click(getByTestId("select-search-fruit"));
		await waitFor(() => {
			const items = document.querySelectorAll('[data-testid="select-option-fruit"]');
			expect(items.length).toBe(3);
		});
	});

	test("Select searchable: clicking an option selects it and closes the list", async () => {
		const user = userEvent.setup();
		const captured: (string | null)[] = [];
		const { getByTestId } = render(
			<SelectForm
				name="fruit"
				value={null}
				onChange={(v) => captured.push(v as string | null)}
				options={{ options: CHOICES, searchable: true }}
			/>,
		);
		await user.click(getByTestId("select-search-fruit"));
		await waitFor(() => {
			expect(
				document.querySelectorAll('[data-testid="select-option-fruit"]').length,
			).toBeGreaterThan(0);
		});
		const options = document.querySelectorAll('[data-testid="select-option-fruit"]');
		await user.click(options[0] as HTMLElement);
		expect(captured.at(-1)).toBe("apple");
		await waitFor(() => {
			expect(document.querySelectorAll('[data-testid="select-option-fruit"]').length).toBe(0);
		});
	});

	test("Select searchable: Escape key closes the options list", async () => {
		const user = userEvent.setup();
		const { getByTestId } = render(
			<SelectForm
				name="fruit"
				value={null}
				onChange={() => {}}
				options={{ options: CHOICES, searchable: true }}
			/>,
		);
		await user.click(getByTestId("select-search-fruit"));
		await waitFor(() => {
			expect(
				document.querySelectorAll('[data-testid="select-option-fruit"]').length,
			).toBeGreaterThan(0);
		});
		await user.keyboard("{Escape}");
		await waitFor(() => {
			expect(document.querySelectorAll('[data-testid="select-option-fruit"]').length).toBe(0);
		});
	});

	test("Select searchable: portals the popup to the body on the shared floating layer", async () => {
		const user = userEvent.setup();
		const { container, getByTestId } = render(
			<SelectForm
				name="fruit"
				value={null}
				onChange={() => {}}
				options={{ options: CHOICES, searchable: true }}
			/>,
		);

		await user.click(getByTestId("select-search-fruit"));
		const positioner = await waitFor(() => getByTestId("select-positioner-fruit"));

		expect(document.body.contains(positioner)).toBe(true);
		expect(container.contains(positioner)).toBe(false);
		expect(positioner.parentElement?.parentElement).toBe(document.body);
		expect(positioner.style.pointerEvents).toBe("auto");
		expect(positioner.className).toContain("z-50");
	});

	test("Select searchable: ArrowDown and Enter select the highlighted option", async () => {
		const user = userEvent.setup();
		const captured: (string | null)[] = [];
		const { getByTestId } = render(
			<SelectForm
				name="fruit"
				value={null}
				onChange={(next) => captured.push(next as string | null)}
				options={{ options: CHOICES, searchable: true }}
			/>,
		);

		const input = getByTestId("select-search-fruit");
		await user.click(input);
		await user.keyboard("{ArrowDown}{Enter}");

		expect(captured.at(-1)).toBe("apple");
		expect(document.activeElement).toBe(input);
		await waitFor(() => {
			expect(document.querySelector('[data-testid="select-option-fruit"]')).toBeNull();
		});
	});

	test("Select searchable: an outside click dismisses the popup", async () => {
		const user = userEvent.setup();
		const { getByTestId } = render(
			<>
				<SelectForm
					name="fruit"
					value={null}
					onChange={() => {}}
					options={{ options: CHOICES, searchable: true }}
				/>
				<button type="button" data-testid="outside">
					Outside
				</button>
			</>,
		);

		await user.click(getByTestId("select-search-fruit"));
		await waitFor(() => {
			expect(document.querySelector('[data-testid="select-option-fruit"]')).not.toBeNull();
		});
		await user.click(getByTestId("outside"));

		await waitFor(() => {
			expect(document.querySelector('[data-testid="select-option-fruit"]')).toBeNull();
		});
	});

	test("Select searchable: selecting a portalled option keeps a parent modal open", async () => {
		const user = userEvent.setup();
		const { getByTestId, getByRole } = render(<ModalSearchableSelect />);

		await user.click(getByTestId("select-search-fruit"));
		const option = await waitFor(
			() => document.querySelector('[data-testid="select-option-fruit"]') as HTMLElement,
		);
		await user.click(option);

		expect(getByRole("dialog")).toBeTruthy();
		expect(getByTestId("select-label-fruit").textContent).toBe("Apple");
	});

	test("Select searchable: a query-backed select keeps the async adapter", async () => {
		const query = mock(async () => [{ value: "remote", label: "Remote option" }]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId } = render(
			<Wrap>
				<SelectForm
					name="fruit"
					value={null}
					onChange={() => {}}
					options={{
						searchable: true,
						options: CHOICES,
						query,
						optionLabel: (row) => String((row as { label: string }).label),
						optionValue: (row) => String((row as { value: string }).value),
					}}
				/>
			</Wrap>,
		);

		await waitFor(() => expect(getByTestId("select-search-fruit")).toBeTruthy());
		expect(query).toHaveBeenCalledTimes(1);
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

function ModalSearchableSelect() {
	const [isOpen, setIsOpen] = useState(true);
	const [value, setValue] = useState<SelectValueType | null>(null);

	return (
		<ModalShell
			open={isOpen}
			onOpenChange={setIsOpen}
			title="Filters"
			description="Filter records"
			onlyDialog
		>
			<SelectForm
				name="fruit"
				value={value}
				onChange={setValue}
				options={{ options: CHOICES, searchable: true }}
			/>
		</ModalShell>
	);
}
