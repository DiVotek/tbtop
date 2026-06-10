import { describe, expect, mock, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { SelectForm } from "./selectField";

ensureBuiltinsRegistered();

const CHOICES = [
	{ value: "1", label: "Alice" },
	{ value: "2", label: "Bob" },
];

// A minimal compiled create config (as it would look after materialize).
function makeCreateConfig() {
	return {
		fields: [
			{
				kind: "text",
				name: "name",
				options: { label: "Name", required: true, constraints: { required: true } },
				meta: {},
			},
		],
		post: async (_ctx: unknown, data: Record<string, unknown>) => {
			return { value: "99", label: String(data.name) };
		},
	};
}

describe("Select field — creatable", () => {
	test("Select creatable: shows '+ Create' affordance when create config is present", async () => {
		const Wrap = wrap(() => new Response("{}"));
		const { container } = render(
			<Wrap>
				<SelectForm
					name="author"
					value={null}
					onChange={() => {}}
					options={{ options: CHOICES, create: makeCreateConfig() }}
				/>
			</Wrap>,
		);
		await waitFor(() => {
			const btn = container.querySelector('[data-testid="select-create-author"]');
			expect(btn).not.toBeNull();
		});
	});

	test("Select creatable: clicking '+ Create' opens a dialog", async () => {
		const user = userEvent.setup();
		const Wrap = wrap(() => new Response("{}"));
		const { container } = render(
			<Wrap>
				<SelectForm
					name="author"
					value={null}
					onChange={() => {}}
					options={{ options: CHOICES, create: makeCreateConfig() }}
				/>
			</Wrap>,
		);
		await waitFor(() =>
			expect(container.querySelector('[data-testid="select-create-author"]')).not.toBeNull(),
		);
		const btn = container.querySelector('[data-testid="select-create-author"]') as HTMLElement;
		await user.click(btn);
		await waitFor(() => {
			expect(container.querySelector('[data-testid="select-create-dialog"]')).not.toBeNull();
		});
	});

	test("Select creatable: successful submit sets the value and closes dialog", async () => {
		const user = userEvent.setup();
		const captured: (string | string[] | null)[] = [];
		const post = mock(async (_ctx: unknown, data: Record<string, unknown>) => ({
			value: "99",
			label: String(data.name),
		}));
		const Wrap = wrap(() => new Response("{}"));
		const { container } = render(
			<Wrap>
				<SelectForm
					name="author"
					value={null}
					onChange={(v) => captured.push(v)}
					options={{
						options: CHOICES,
						create: { fields: makeCreateConfig().fields, post },
					}}
				/>
			</Wrap>,
		);
		await waitFor(() =>
			expect(container.querySelector('[data-testid="select-create-author"]')).not.toBeNull(),
		);
		await user.click(
			container.querySelector('[data-testid="select-create-author"]') as HTMLElement,
		);
		await waitFor(() =>
			expect(container.querySelector('[data-testid="select-create-dialog"]')).not.toBeNull(),
		);

		// Fill in the name field
		const nameInput = container.querySelector(
			'input[name="name"], [data-testid="field-name"]',
		) as HTMLInputElement;
		expect(nameInput).not.toBeNull();
		await user.type(nameInput, "Carol");

		// Submit
		const submitBtn = container.querySelector(
			'[data-testid="select-create-submit"]',
		) as HTMLElement;
		expect(submitBtn).not.toBeNull();
		await user.click(submitBtn);

		await waitFor(() => {
			expect(captured.at(-1)).toBe("99");
			// Dialog closes
			expect(container.querySelector('[data-testid="select-create-dialog"]')).toBeNull();
		});
	});

	test("Select creatable: 422 response shows field errors", async () => {
		const user = userEvent.setup();
		const post = mock(async () => {
			const err = new Error("Validation failed");
			(err as Error & { errors: Record<string, string> }).errors = {
				name: "Name is required",
			};
			throw err;
		});
		const Wrap = wrap(() => new Response("{}"));
		const { container } = render(
			<Wrap>
				<SelectForm
					name="author"
					value={null}
					onChange={() => {}}
					options={{
						options: CHOICES,
						create: { fields: makeCreateConfig().fields, post },
					}}
				/>
			</Wrap>,
		);
		await waitFor(() =>
			expect(container.querySelector('[data-testid="select-create-author"]')).not.toBeNull(),
		);
		await user.click(
			container.querySelector('[data-testid="select-create-author"]') as HTMLElement,
		);
		await waitFor(() =>
			expect(container.querySelector('[data-testid="select-create-dialog"]')).not.toBeNull(),
		);

		// Submit without filling in name
		await user.click(
			container.querySelector('[data-testid="select-create-submit"]') as HTMLElement,
		);

		await waitFor(() => {
			expect(container.textContent).toContain("Name is required");
			// Dialog stays open
			expect(container.querySelector('[data-testid="select-create-dialog"]')).not.toBeNull();
		});
	});
});
