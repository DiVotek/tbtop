import { describe, expect, mock, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderNode } from "../render/structureRenderer";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { TagsCell, TagsForm } from "./tagsField";

const NO_RESP = () => new Response("{}");

const CLOSED_CHOICES = [
	{ value: "bug", label: "Bug" },
	{ value: "feat", label: "Feature" },
];

describe("Tags field — open-ended mode", () => {
	test("Tags open mounts inside a form", async () => {
		const node = s.form({ query: async () => ({ labels: [] }) }, [
			s.tags({ name: "labels", label: "Labels" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("tags-labels")).toBeTruthy());
	});

	test("Tags open Enter commits the current input as a new chip", async () => {
		const captured: (string[] | null)[] = [];
		const user = userEvent.setup();
		const { getByPlaceholderText } = render(
			<TagsForm
				name="labels"
				value={[]}
				onChange={(next) => {
					captured.push(next);
				}}
				options={{}}
			/>,
		);
		const input = getByPlaceholderText("Add tag…");
		await user.type(input, "urgent");
		await user.keyboard("{Enter}");
		expect(captured.at(-1)).toEqual(["urgent"]);
	});

	test("Tags open removing a chip emits the remaining values", async () => {
		const captured: (string[] | null)[] = [];
		const user = userEvent.setup();
		const { container } = render(
			<TagsForm
				name="labels"
				value={["a", "b"]}
				onChange={(next) => {
					captured.push(next);
				}}
				options={{}}
			/>,
		);
		const removeBtns = container.querySelectorAll("button[aria-label^='Remove']");
		await user.click(removeBtns[0] as HTMLElement);
		expect(captured.at(-1)).toEqual(["b"]);
	});
});

describe("Tags field — closed-enum mode", () => {
	test("Tags closed renders one option per choice", () => {
		const { container } = render(
			<TagsForm
				name="labels"
				value={[]}
				onChange={() => {}}
				options={{ options: CLOSED_CHOICES }}
			/>,
		);
		const opts = container.querySelectorAll('[role="option"]');
		expect(opts.length).toBe(2);
	});

	test("Tags closed clicking an option appends its value", async () => {
		const captured: (string[] | null)[] = [];
		const user = userEvent.setup();
		const { container } = render(
			<TagsForm
				name="labels"
				value={[]}
				onChange={(next) => {
					captured.push(next);
				}}
				options={{ options: CLOSED_CHOICES }}
			/>,
		);
		const opts = container.querySelectorAll('[role="option"]') as NodeListOf<HTMLElement>;
		await user.click(opts[0] as HTMLElement);
		expect(captured.at(-1)).toEqual(["bug"]);
	});

	test("Tags closed clicking a selected option toggles it off", async () => {
		const captured: (string[] | null)[] = [];
		const user = userEvent.setup();
		const { container } = render(
			<TagsForm
				name="labels"
				value={["bug"]}
				onChange={(next) => {
					captured.push(next);
				}}
				options={{ options: CLOSED_CHOICES }}
			/>,
		);
		const opts = container.querySelectorAll('[role="option"]') as NodeListOf<HTMLElement>;
		await user.click(opts[0] as HTMLElement);
		expect(captured.at(-1)).toEqual([]);
	});
});

interface UserRow {
	id: string;
	name: string;
}

describe("Tags field — async mode", () => {
	test("Tags async onLoad is called once with the value array and resolves all chips", async () => {
		const onLoad = mock(
			async (_c: unknown, values: string[]): Promise<UserRow[]> =>
				values.map((id) => ({ id, name: `User ${id}` })),
		);
		const query = mock(async (): Promise<UserRow[]> => []);
		const Wrap = wrap(NO_RESP);
		const { container } = render(
			<Wrap>
				<TagsForm
					name="authorIds"
					value={["1", "2"]}
					onChange={() => {}}
					options={{
						query,
						onLoad,
						optionLabel: (r) => (r as UserRow).name,
						optionValue: (r) => (r as UserRow).id,
					}}
				/>
			</Wrap>,
		);
		await waitFor(() => {
			expect(container.querySelector('[data-testid="chip-authorIds-1"]')).not.toBeNull();
		});
		expect(container.querySelector('[data-testid="chip-authorIds-1"]')?.textContent).toContain(
			"User 1",
		);
		expect(onLoad).toHaveBeenCalledTimes(1);
		expect(onLoad).toHaveBeenCalledWith(expect.anything(), ["1", "2"]);
	});

	test("Tags async onLoad returning partial rows hides unresolved values", async () => {
		const onLoad = mock(
			async (_c: unknown, _values: string[]): Promise<UserRow[]> => [
				{ id: "1", name: "Alice" },
			],
		);
		const query = mock(async (): Promise<UserRow[]> => []);
		const Wrap = wrap(NO_RESP);
		const { container } = render(
			<Wrap>
				<TagsForm
					name="authorIds"
					value={["1", "2"]}
					onChange={() => {}}
					options={{
						query,
						onLoad,
						optionLabel: (r) => (r as UserRow).name,
						optionValue: (r) => (r as UserRow).id,
					}}
				/>
			</Wrap>,
		);
		await waitFor(() =>
			expect(container.querySelector('[data-testid="chip-authorIds-1"]')).not.toBeNull(),
		);
		expect(container.querySelector('[data-testid="chip-authorIds-1"]')?.textContent).toContain(
			"Alice",
		);
		expect(container.querySelector('[data-testid="chip-authorIds-2"]')).toBeNull();
	});

	test("Tags async picking a suggestion appends its value", async () => {
		const user = userEvent.setup();
		const captured: (string[] | null)[] = [];
		const query = mock(
			async (): Promise<UserRow[]> => [
				{ id: "1", name: "Alice" },
				{ id: "2", name: "Bob" },
			],
		);
		const Wrap = wrap(NO_RESP);
		const { container } = render(
			<Wrap>
				<TagsForm
					name="authorIds"
					value={[]}
					onChange={(next) => {
						captured.push(next);
					}}
					options={{
						query,
						optionLabel: (r) => (r as UserRow).name,
						optionValue: (r) => (r as UserRow).id,
					}}
				/>
			</Wrap>,
		);
		await waitFor(() =>
			expect(container.querySelectorAll('[role="option"]').length).toBeGreaterThan(0),
		);
		const opts = container.querySelectorAll('[role="option"]');
		await user.click(opts[0] as HTMLElement);
		expect(captured.at(-1)).toEqual(["1"]);
	});
});

describe("Tags cell", () => {
	test("TagsCell renders one chip per value with closed-enum labels", () => {
		const { container } = render(
			<TagsCell value={["bug", "feat"]} options={{ options: CLOSED_CHOICES }} />,
		);
		expect(container.textContent).toContain("Bug");
		expect(container.textContent).toContain("Feature");
	});

	test("TagsCell falls back to raw values when no options are provided", () => {
		const { container } = render(<TagsCell value={["urgent", "review"]} />);
		expect(container.textContent).toContain("urgent");
		expect(container.textContent).toContain("review");
	});

	test("TagsCell renders nothing for null and empty arrays", () => {
		const { container, rerender } = render(<TagsCell value={null} />);
		expect(container.textContent).toBe("");
		rerender(<TagsCell value={[]} />);
		expect(container.textContent).toBe("");
	});
});
