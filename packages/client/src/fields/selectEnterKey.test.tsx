import { describe, expect, mock, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { SelectForm } from "./selectField";

ensureBuiltinsRegistered();

// Rule: Enter in a select's search box picks the highlighted option or does
// nothing. It never submits the surrounding form — that saved half-filled pages.

interface Row {
	id: string;
	name: string;
}

const ROWS: Row[] = [
	{ id: "1", name: "Appeal" },
	{ id: "2", name: "Divorce" },
];

const asyncBag = (query: (c: unknown, s: string) => Promise<Row[]>) => ({
	query,
	onLoad: async (): Promise<Row[]> => [],
	optionLabel: (r: unknown) => (r as Row).name,
	optionValue: (r: unknown) => (r as Row).id,
});

function inForm(children: ReactNode, onSubmit: () => void) {
	const Wrap = wrap(() => new Response("{}"));
	return render(
		<Wrap>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					onSubmit();
				}}
			>
				{children}
				<button type="submit">Save</button>
			</form>
		</Wrap>,
	);
}

const settle = () => new Promise((r) => setTimeout(r, 400));

describe("Select — Enter in the search box", () => {
	test("async multiple: Enter with nothing highlighted does not submit the form", async () => {
		const submit = mock(() => {});
		const user = userEvent.setup();
		const { container } = inForm(
			<SelectForm
				name="practices"
				value={[]}
				onChange={() => {}}
				options={{ ...asyncBag(async () => ROWS), multiple: true }}
			/>,
			submit,
		);
		await waitFor(() => expect(container.querySelector("input")).not.toBeNull());
		const input = container.querySelector("input") as HTMLInputElement;

		await user.type(input, "app");
		await settle();
		await user.keyboard("{Enter}");

		expect(submit).not.toHaveBeenCalled();
	});

	test("async multiple: Enter picks the highlighted option and does not submit", async () => {
		const submit = mock(() => {});
		const picked: unknown[] = [];
		const user = userEvent.setup();
		const { container } = inForm(
			<SelectForm
				name="practices"
				value={[]}
				onChange={(next) => picked.push(next)}
				options={{ ...asyncBag(async () => ROWS), multiple: true }}
			/>,
			submit,
		);
		await waitFor(() => expect(container.querySelector("input")).not.toBeNull());
		const input = container.querySelector("input") as HTMLInputElement;

		await user.type(input, "a");
		await settle();
		await user.keyboard("{ArrowDown}{Enter}");

		expect(picked).toContainEqual(["1"]);
		expect(submit).not.toHaveBeenCalled();
	});

	test("searchable single: Enter with nothing highlighted does not submit the form", async () => {
		const submit = mock(() => {});
		const user = userEvent.setup();
		const { getByTestId } = inForm(
			<SelectForm
				name="fruit"
				value={null}
				onChange={() => {}}
				options={{
					options: [{ value: "apple", label: "Apple" }],
					searchable: true,
				}}
			/>,
			submit,
		);
		const input = getByTestId("select-search-fruit") as HTMLInputElement;

		await user.type(input, "app");
		await user.keyboard("{Enter}");

		expect(submit).not.toHaveBeenCalled();
	});
});

// Rule: a failed search reads as a failure, not as a load that never ends.
describe("Select multi async — failed search", () => {
	test("keeps the control and says the options failed to load", async () => {
		const user = userEvent.setup();
		const { container } = inForm(
			<SelectForm
				name="practices"
				value={[]}
				onChange={() => {}}
				options={{
					...asyncBag(async (_c, s) => {
						if (s !== "") {
							throw new Error("500");
						}
						return ROWS;
					}),
					multiple: true,
				}}
			/>,
			() => {},
		);
		await waitFor(() => expect(container.querySelector("input")).not.toBeNull());

		await user.type(container.querySelector("input") as HTMLInputElement, "x");

		await waitFor(() => {
			expect(
				document.body.querySelector('[data-testid="select-failed-practices"]'),
			).not.toBeNull();
		});
		expect(container.querySelector('[data-testid="field-skeleton"]')).toBeNull();
		expect(container.querySelector("input")).not.toBeNull();
	});
});
