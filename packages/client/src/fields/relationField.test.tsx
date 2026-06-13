import { describe, expect, mock, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { RelationForm } from "./relationField";

ensureBuiltinsRegistered();

const ROWS = [
	{ value: "1", label: "Alice Smith" },
	{ value: "2", label: "Bob Jones" },
];

const Wrap = wrap(() => new Response("{}"));

/** Options as materialize.ts injects them post-materialize. */
function makeOpts(overrides: Record<string, unknown> = {}) {
	return {
		query: mock(async () => ROWS),
		onLoad: mock(async (_ctx: unknown, value: string) => {
			const found = ROWS.find((r) => r.value === value);
			if (!found) {
				throw new Error("not found");
			}
			return found;
		}),
		optionLabel: (row: unknown) => (row as { label: string }).label,
		optionValue: (row: unknown) => (row as { value: string }).value,
		...overrides,
	};
}

describe("RelationForm", () => {
	test("renders a select trigger after query resolves", async () => {
		const { container } = render(
			<Wrap>
				<RelationForm
					name="author_id"
					value={null}
					onChange={() => {}}
					options={makeOpts()}
				/>
			</Wrap>,
		);

		await waitFor(() => {
			expect(container.querySelector('[data-testid="relation-author_id"]')).not.toBeNull();
		});
	});

	test("selecting an option calls onChange with the value string", async () => {
		const user = userEvent.setup();
		const captured: (string | null)[] = [];

		const { container } = render(
			<Wrap>
				<RelationForm
					name="author_id"
					value={null}
					onChange={(v) => captured.push(v)}
					options={makeOpts()}
				/>
			</Wrap>,
		);

		await waitFor(() =>
			expect(container.querySelector('[data-testid="relation-author_id"]')).not.toBeNull(),
		);

		await user.click(
			container.querySelector('[data-testid="relation-author_id"]') as HTMLElement,
		);

		await waitFor(() => {
			expect(document.body.querySelectorAll("[role='option']").length).toBeGreaterThan(0);
		});

		const items = document.body.querySelectorAll("[role='option']");
		await user.click(items[0] as HTMLElement);

		await waitFor(() => {
			expect(captured.at(-1)).toBe("1");
		});
	});

	test("shows loading skeleton while initial value is being resolved by onLoad", async () => {
		let resolveOnLoad!: (v: unknown) => void;
		const pending = new Promise((res) => {
			resolveOnLoad = res;
		});

		const opts = makeOpts({
			onLoad: mock(async () => pending),
		});

		const { container } = render(
			<Wrap>
				<RelationForm name="author_id" value="1" onChange={() => {}} options={opts} />
			</Wrap>,
		);

		// Skeleton shown while onLoad is in-flight — trigger must be absent
		await waitFor(() => {
			expect(container.querySelector('[data-testid="relation-author_id"]')).toBeNull();
		});

		resolveOnLoad({ value: "1", label: "Alice Smith" });
	});
});
