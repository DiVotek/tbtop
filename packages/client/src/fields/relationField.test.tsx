import { describe, expect, mock, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { RelationCell, RelationForm } from "./relationField";

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

	test("resolves the label for an int FK value (records carry int FKs)", async () => {
		const opts = makeOpts();
		// Records arrive with an int FK (author_id: 1) though the prop type says string.
		const intValue = 1 as unknown as Parameters<typeof RelationForm>[0]["value"];
		const { container } = render(
			<Wrap>
				<RelationForm
					name="author_id"
					value={intValue}
					onChange={() => {}}
					options={opts}
				/>
			</Wrap>,
		);
		await waitFor(() => {
			expect(container.querySelector('[data-slot="select-trigger"]')?.textContent).toContain(
				"Alice Smith",
			);
		});
		expect(opts.onLoad).toHaveBeenCalledWith(expect.anything(), "1");
	});
});

describe("RelationCell", () => {
	test("renders an int FK as plain text, not a JSON code block", () => {
		const { container } = render(<RelationCell value={5} />);
		expect(container.textContent).toBe("5");
		expect(container.querySelector("code")).toBeNull();
	});

	test("renders a string FK as text", () => {
		const { container } = render(<RelationCell value="42" />);
		expect(container.textContent).toBe("42");
	});

	test("resolves the name from an eager-loaded related record", () => {
		const { container } = render(<RelationCell value={{ id: 5, name: "Carol" }} />);
		expect(container.textContent).toBe("Carol");
	});

	test("falls back to title when the record has no name", () => {
		const { container } = render(<RelationCell value={{ id: 7, title: "Spec" }} />);
		expect(container.textContent).toBe("Spec");
	});

	test("summarizes a to-many array as a count", () => {
		const { container } = render(<RelationCell value={[1, 2, 3]} />);
		expect(container.textContent).toBe("3 items");
	});

	test("renders nothing for a null value", () => {
		const { container } = render(<RelationCell value={null} />);
		expect(container.textContent).toBe("");
	});
});
