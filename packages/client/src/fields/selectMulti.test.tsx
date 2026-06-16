import { describe, expect, mock, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { SelectForm } from "./selectField";

ensureBuiltinsRegistered();

const NO_RESP = () => new Response("{}");

const CHOICES = [
	{ value: "1", label: "Alice" },
	{ value: "2", label: "Bob" },
];

function makeCreateConfig(
	post?: (
		ctx: unknown,
		data: Record<string, unknown>,
	) => Promise<{ value: string; label: string }>,
) {
	return {
		fields: [
			{
				kind: "text",
				name: "name",
				options: { label: "Name", required: true, constraints: { required: true } },
				meta: {},
			},
		],
		post:
			post ??
			mock(async (_ctx: unknown, data: Record<string, unknown>) => ({
				value: "99",
				label: String(data.name),
			})),
	};
}

describe("Select multi — create affordance visibility", () => {
	test("shows '+ Create' button when create config is present", () => {
		const Wrap = wrap(NO_RESP);
		const { container } = render(
			<Wrap>
				<SelectForm
					name="tags"
					value={[]}
					onChange={() => {}}
					options={{ options: CHOICES, multiple: true, create: makeCreateConfig() }}
				/>
			</Wrap>,
		);
		expect(container.querySelector('[data-testid="select-create-tags"]')).not.toBeNull();
	});

	test("does NOT show '+ Create' button when create config is absent", () => {
		const Wrap = wrap(NO_RESP);
		const { container } = render(
			<Wrap>
				<SelectForm
					name="tags"
					value={[]}
					onChange={() => {}}
					options={{ options: CHOICES, multiple: true }}
				/>
			</Wrap>,
		);
		expect(container.querySelector('[data-testid="select-create-tags"]')).toBeNull();
	});
});

describe("Select multi — create appends value", () => {
	test("appends new value to existing selection (static multi)", async () => {
		const captured: (string | string[] | null)[] = [];
		const post = mock(async () => ({ value: "99", label: "Carol" }));
		const user = userEvent.setup();
		const Wrap = wrap(NO_RESP);
		const { container } = render(
			<Wrap>
				<SelectForm
					name="tags"
					value={["1"]}
					onChange={(v) => captured.push(v)}
					options={{ options: CHOICES, multiple: true, create: makeCreateConfig(post) }}
				/>
			</Wrap>,
		);

		const createBtn = container.querySelector(
			'[data-testid="select-create-tags"]',
		) as HTMLElement;
		expect(createBtn).not.toBeNull();
		await user.click(createBtn);

		await waitFor(() =>
			expect(
				document.body.querySelector('[data-testid="select-create-dialog"]'),
			).not.toBeNull(),
		);

		const nameInput = document.body.querySelector('input[name="name"]') as HTMLInputElement;
		await user.type(nameInput, "Carol");

		await user.click(
			document.body.querySelector('[data-testid="select-create-submit"]') as HTMLElement,
		);

		await waitFor(() => {
			expect(captured.at(-1)).toEqual(["1", "99"]);
		});
	});

	test("does not duplicate: creating an already-present value is a no-op", async () => {
		const captured: (string | string[] | null)[] = [];
		// post returns a value that is already in the selection
		const post = mock(async () => ({ value: "1", label: "Alice" }));
		const user = userEvent.setup();
		const Wrap = wrap(NO_RESP);
		const { container } = render(
			<Wrap>
				<SelectForm
					name="tags"
					value={["1", "2"]}
					onChange={(v) => captured.push(v)}
					options={{ options: CHOICES, multiple: true, create: makeCreateConfig(post) }}
				/>
			</Wrap>,
		);

		await user.click(
			container.querySelector('[data-testid="select-create-tags"]') as HTMLElement,
		);

		await waitFor(() =>
			expect(
				document.body.querySelector('[data-testid="select-create-dialog"]'),
			).not.toBeNull(),
		);

		const nameInput = document.body.querySelector('input[name="name"]') as HTMLInputElement;
		await user.type(nameInput, "Alice");

		await user.click(
			document.body.querySelector('[data-testid="select-create-submit"]') as HTMLElement,
		);

		// onChange should NOT have been called (no duplicate appended)
		await waitFor(() => {
			// Dialog closes (the affordance still calls setOpen(false))
			expect(document.body.querySelector('[data-testid="select-create-dialog"]')).toBeNull();
		});
		expect(captured).toHaveLength(0);
	});
});
