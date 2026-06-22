import { describe, expect, mock, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { SelectForm } from "./selectField";
import type { SelectOptionsBag, SelectValueType } from "./selectShared";

ensureBuiltinsRegistered();

const CHOICES = [
	{ value: "1", label: "Alice" },
	{ value: "2", label: "Bob" },
];

// Controlled host — feeds onChange back as value so the displayed label
// reflects the newly created option, the way a real form controller does.
function ControlledSelect({ name, options }: { name: string; options: SelectOptionsBag }) {
	const [value, setValue] = useState<SelectValueType | null>(null);
	return <SelectForm name={name} value={value} onChange={setValue} options={options} />;
}

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
			expect(
				document.body.querySelector('[data-testid="select-create-dialog"]'),
			).not.toBeNull();
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
			expect(
				document.body.querySelector('[data-testid="select-create-dialog"]'),
			).not.toBeNull(),
		);

		// Fill in the name field
		const nameInput = document.body.querySelector(
			'input[name="name"], [data-testid="field-name"]',
		) as HTMLInputElement;
		expect(nameInput).not.toBeNull();
		await user.type(nameInput, "Carol");

		// Submit
		const submitBtn = document.body.querySelector(
			'[data-testid="select-create-submit"]',
		) as HTMLElement;
		expect(submitBtn).not.toBeNull();
		await user.click(submitBtn);

		await waitFor(() => {
			expect(captured.at(-1)).toBe("99");
			// Dialog closes
			expect(document.body.querySelector('[data-testid="select-create-dialog"]')).toBeNull();
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
			expect(
				document.body.querySelector('[data-testid="select-create-dialog"]'),
			).not.toBeNull(),
		);

		// Submit without filling in name
		await user.click(
			document.body.querySelector('[data-testid="select-create-submit"]') as HTMLElement,
		);

		await waitFor(() => {
			expect(document.body.textContent).toContain("Name is required");
			// Dialog stays open
			expect(
				document.body.querySelector('[data-testid="select-create-dialog"]'),
			).not.toBeNull();
		});
	});

	test("Select creatable (searchable): displays the created label, not the value", async () => {
		const user = userEvent.setup();
		const post = mock(async (_ctx: unknown, data: Record<string, unknown>) => ({
			value: "99",
			label: String(data.name),
		}));
		const Wrap = wrap(() => new Response("{}"));
		const { container } = render(
			<Wrap>
				<ControlledSelect
					name="author"
					options={{
						options: CHOICES,
						searchable: true,
						create: { fields: makeCreateConfig().fields, post },
					}}
				/>
			</Wrap>,
		);
		await openDialogAndCreate(user, container, "author", "Carol");

		await waitFor(() => {
			// Label shows as normal visible text, not the raw value, and not gray placeholder.
			const label = container.querySelector(
				'[data-testid="select-label-author"]',
			) as HTMLElement;
			expect(label).not.toBeNull();
			expect(label.textContent).toBe("Carol");
			expect(label.className).toContain("text-foreground");
			const input = container.querySelector(
				'[data-testid="select-search-author"]',
			) as HTMLInputElement;
			expect(input.placeholder).not.toBe("99");
			expect(input.placeholder).not.toBe("Carol");
		});
	});

	test("Select creatable (static): displays the created label, not the value", async () => {
		const user = userEvent.setup();
		const post = mock(async (_ctx: unknown, data: Record<string, unknown>) => ({
			value: "99",
			label: String(data.name),
		}));
		const Wrap = wrap(() => new Response("{}"));
		const { container } = render(
			<Wrap>
				<ControlledSelect
					name="author"
					options={{
						options: CHOICES,
						create: { fields: makeCreateConfig().fields, post },
					}}
				/>
			</Wrap>,
		);
		await openDialogAndCreate(user, container, "author", "Carol");

		await waitFor(() => {
			const trigger = container.querySelector('[data-testid="select-author"]') as HTMLElement;
			expect(trigger.textContent).toContain("Carol");
			expect(trigger.textContent).not.toContain("99");
		});
	});

	test("Select creatable (async): re-queries after create so the new option lists", async () => {
		const user = userEvent.setup();
		const rows = [{ value: "1", label: "Alice" }];
		const query = mock(async () => rows);
		const post = mock(async (_ctx: unknown, data: Record<string, unknown>) => {
			const created = { value: "99", label: String(data.name) };
			rows.push(created); // server now knows the new option
			return created;
		});
		const Wrap = wrap(() => new Response("{}"));
		const { container } = render(
			<Wrap>
				<ControlledSelect
					name="author"
					options={{
						query,
						optionValue: (r) => (r as { value: string }).value,
						optionLabel: (r) => (r as { label: string }).label,
						create: { fields: makeCreateConfig().fields, post },
					}}
				/>
			</Wrap>,
		);
		await waitFor(() =>
			expect(container.querySelector('[data-testid="select-create-author"]')).not.toBeNull(),
		);
		const callsBeforeCreate = query.mock.calls.length;
		await openDialogAndCreate(user, container, "author", "Carol");

		await waitFor(() => {
			expect(query.mock.calls.length).toBeGreaterThan(callsBeforeCreate);
		});
	});
});

async function openDialogAndCreate(
	user: ReturnType<typeof userEvent.setup>,
	container: HTMLElement,
	name: string,
	value: string,
): Promise<void> {
	await waitFor(() =>
		expect(container.querySelector(`[data-testid="select-create-${name}"]`)).not.toBeNull(),
	);
	await user.click(
		container.querySelector(`[data-testid="select-create-${name}"]`) as HTMLElement,
	);
	await waitFor(() =>
		expect(document.body.querySelector('[data-testid="select-create-dialog"]')).not.toBeNull(),
	);
	const nameInput = document.body.querySelector(
		'input[name="name"], [data-testid="field-name"]',
	) as HTMLInputElement;
	await user.type(nameInput, value);
	await user.click(
		document.body.querySelector('[data-testid="select-create-submit"]') as HTMLElement,
	);
	await waitFor(() =>
		expect(document.body.querySelector('[data-testid="select-create-dialog"]')).toBeNull(),
	);
}
