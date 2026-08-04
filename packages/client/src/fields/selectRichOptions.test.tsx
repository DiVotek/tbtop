import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { SelectForm } from "./selectField";

ensureBuiltinsRegistered();

const NO_RESP = () => new Response("{}");

const RICH_CHOICES = [
	{
		value: "12",
		label: "Toyota Camry",
		display: { image: "https://cdn.test/12.jpg", subtitle: "Sedan · black" },
	},
	{
		value: "13",
		label: "Renault Duster",
		display: { html: "<b>Duster</b> <i>crossover</i>" },
	},
];

// Rule: the dropdown row is the surface that shows an option in full.
describe("Select rich options — dropdown render", () => {
	test("the preview and the subtitle reach the row", async () => {
		const user = userEvent.setup();
		const { getByTestId } = render(
			<SelectForm
				name="car"
				value={null}
				onChange={() => {}}
				options={{ options: RICH_CHOICES }}
			/>,
		);
		await user.click(getByTestId("select-car"));

		const row = await waitFor(() => {
			const found = document.querySelector('[role="option"]');
			expect(found).not.toBeNull();
			return found as HTMLElement;
		});
		expect(row.querySelector("img")?.getAttribute("src")).toBe("https://cdn.test/12.jpg");
		expect(row.textContent).toContain("Sedan · black");
	});
});

// Rule: label is the option's text identity. Radix derives keyboard typeahead
// from item text, which ignores aria-hidden — only an explicit textValue keeps
// subtitle and markup out of it.
describe("Select rich options — typeahead", () => {
	async function typeaheadPick(keys: string): Promise<string | null> {
		const user = userEvent.setup();
		let picked: string | null = null;
		const { getByTestId, unmount } = render(
			<SelectForm
				name="car"
				value={null}
				onChange={(v) => {
					picked = v as string;
				}}
				options={{ options: RICH_CHOICES }}
			/>,
		);
		await user.click(getByTestId("select-car"));
		await waitFor(() => {
			expect(document.querySelectorAll('[role="option"]')).toHaveLength(2);
		});
		await user.keyboard(keys);
		await user.keyboard("{Enter}");
		unmount();
		return picked;
	}

	// Radix matches from the start of an item's text.
	test("a label match selects its option", async () => {
		expect(await typeaheadPick("renault")).toBe("13");
	});

	test("a word living only in subtitle or markup never matches", async () => {
		// Option 13's text would start with "Duster" if markup fed typeahead;
		// option 12's would start with "Toyota CamrySedan" if the subtitle did.
		expect(await typeaheadPick("duster")).not.toBe("13");
	});

	test("the trigger shows the label once, not twice", () => {
		const { getByTestId } = render(
			<SelectForm
				name="car"
				value="12"
				onChange={() => {}}
				options={{ options: RICH_CHOICES }}
			/>,
		);
		expect(getByTestId("select-car").textContent).toBe("Toyota Camry");
	});
});

// Rule: html wins. Passing it beside image/subtitle is legal and renders the
// markup alone — a developer typo must degrade, never error or double-render.
describe("Select rich options — html precedence", () => {
	test("html renders alone when image and subtitle are also present", () => {
		const { getByTestId } = render(
			<SelectForm
				name="plan"
				value="both"
				onChange={() => {}}
				options={{
					options: [
						{
							value: "both",
							label: "Pro",
							display: {
								image: "https://cdn.test/x.jpg",
								subtitle: "should not render",
								html: "<b>Markup</b>",
							},
						},
					],
				}}
			/>,
		);
		const trigger = getByTestId("select-plan");
		expect(trigger.querySelector("img")).toBeNull();
		expect(trigger.textContent).not.toContain("should not render");
		expect(trigger.querySelector("b")?.textContent).toBe("Markup");
	});
});

// Rule: searchable() filters on label only. Markup is layout, not text — a
// query matching a tag name or an html-only word must not surface the option.
describe("Select rich options — search", () => {
	test("an option is found by its label", async () => {
		const user = userEvent.setup();
		const { getByTestId, getAllByTestId } = render(
			<SelectForm
				name="car"
				value={null}
				onChange={() => {}}
				options={{ options: RICH_CHOICES, searchable: true }}
			/>,
		);
		await user.type(getByTestId("select-search-car"), "duster");

		await waitFor(() => {
			expect(getAllByTestId("select-option-car")).toHaveLength(1);
		});
	});

	test("text living only inside html never matches", async () => {
		const user = userEvent.setup();
		const { getByTestId, queryAllByTestId } = render(
			<SelectForm
				name="car"
				value={null}
				onChange={() => {}}
				options={{ options: RICH_CHOICES, searchable: true }}
			/>,
		);
		// "crossover" appears in the option's markup but not in its label.
		await user.type(getByTestId("select-search-car"), "crossover");

		await waitFor(() => {
			expect(queryAllByTestId("select-option-car")).toHaveLength(0);
		});
	});
});

// Rule: an empty value means "nothing selected". Carrying options as objects
// makes an empty one truthy, which would silently hide the placeholder.
describe("Select rich options — empty value", () => {
	test("an empty string value still shows the placeholder", () => {
		const { getByTestId, queryByTestId } = render(
			<SelectForm
				name="car"
				value=""
				onChange={() => {}}
				options={{ options: RICH_CHOICES, searchable: true }}
			/>,
		);
		expect(queryByTestId("select-label-car")).toBeNull();
		expect((getByTestId("select-search-car") as HTMLInputElement).placeholder).not.toBe("");
	});
});

// Rule: label is the option's text identity. The chip renders rich content but
// its remove button's accessible name stays plain text.
describe("Select rich options — chip accessibility", () => {
	test("chip remove keeps the plain label in its accessible name", async () => {
		const Wrap = wrap(NO_RESP);
		const { container } = render(
			<Wrap>
				<SelectForm
					name="cars"
					value={["12"]}
					onChange={() => {}}
					options={{ options: RICH_CHOICES, multiple: true }}
				/>
			</Wrap>,
		);

		await waitFor(() => {
			expect(container.querySelector('[data-testid="chip-12"]')).not.toBeNull();
		});
		const remove = container.querySelector('[data-testid="chip-12"] [aria-label]');
		expect(remove?.getAttribute("aria-label")).toContain("Toyota Camry");
	});
});
