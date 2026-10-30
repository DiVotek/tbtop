import { describe, expect, mock, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { RelationForm, type RelationOptionsBag } from "./relationField";
import type { SelectCreateConfig } from "./selectShared";

ensureBuiltinsRegistered();

const ROWS = [{ value: "1", label: "Alice" }];

const NAME_FIELD = {
	kind: "text",
	name: "name",
	options: { label: "Name", required: true, constraints: { required: true } },
	meta: {},
};

/** Options as materialize.ts injects them, plus a create config. */
function makeOpts(create: SelectCreateConfig | undefined) {
	return {
		query: mock(async () => ROWS),
		onLoad: mock(async (_ctx: unknown, value: string) => {
			if (value === "99") {
				throw new Error("a created row must not be re-resolved");
			}
			return ROWS[0];
		}),
		optionLabel: (row: unknown) => (row as { label: string }).label,
		optionValue: (row: unknown) => (row as { value: string }).value,
		create,
	} as RelationOptionsBag;
}

function Controlled({ options }: { options: RelationOptionsBag }) {
	const [value, setValue] = useState<string | null>(null);
	return <RelationForm name="author_id" value={value} onChange={setValue} options={options} />;
}

async function createThrough(user: ReturnType<typeof userEvent.setup>, name: string) {
	const link = await waitFor(() => {
		const el = document.body.querySelector('[data-testid="select-create-author_id"]');
		expect(el).not.toBeNull();
		return el as HTMLElement;
	});
	await user.click(link);
	const input = await waitFor(() => {
		const el = document.body.querySelector('[data-testid="select-create-dialog"] input');
		expect(el).not.toBeNull();
		return el as HTMLInputElement;
	});
	await user.type(input, name);
	await user.click(
		document.body.querySelector('[data-testid="select-create-submit"]') as HTMLElement,
	);
}

describe("Relation field — creatable", () => {
	test("without create config there is no create link", async () => {
		const Wrap = wrap(() => new Response("{}"));
		const { container } = render(
			<Wrap>
				<RelationForm
					name="author_id"
					value={null}
					onChange={() => {}}
					options={makeOpts(undefined)}
				/>
			</Wrap>,
		);
		await waitFor(() =>
			expect(container.querySelector('[data-testid="select-author_id"]')).not.toBeNull(),
		);
		expect(container.querySelector('[data-testid="select-create-author_id"]')).toBeNull();
	});

	test("a created record becomes the value and shows its label", async () => {
		const user = userEvent.setup();
		const post = mock(async (_ctx: unknown, data: Record<string, unknown>) => ({
			value: "99",
			label: String(data.name),
		}));
		const Wrap = wrap(() => new Response("{}"));
		const { container } = render(
			<Wrap>
				<Controlled options={makeOpts({ fields: [NAME_FIELD], post })} />
			</Wrap>,
		);

		await createThrough(user, "Carol");

		await waitFor(() => {
			expect(document.body.querySelector('[data-testid="select-create-dialog"]')).toBeNull();
			expect(container.textContent).toContain("Carol");
		});
		expect(post.mock.calls[0]?.[1]).toEqual({ name: "Carol" });
	});

	test("validation errors stay in the dialog", async () => {
		const user = userEvent.setup();
		const post = mock(async () => {
			throw Object.assign(new Error("Validation failed"), {
				errors: { name: "Name is taken" },
			});
		});
		const Wrap = wrap(() => new Response("{}"));
		render(
			<Wrap>
				<Controlled options={makeOpts({ fields: [NAME_FIELD], post })} />
			</Wrap>,
		);

		await createThrough(user, "Alice");

		await waitFor(() =>
			expect(
				document.body.querySelector('[data-testid="field-error-name"]')?.textContent,
			).toBe("Name is taken"),
		);
	});
});
