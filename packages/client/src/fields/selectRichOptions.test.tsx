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
