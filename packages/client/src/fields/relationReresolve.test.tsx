import { describe, expect, mock, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { useState } from "react";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { RelationForm } from "./relationField";

ensureBuiltinsRegistered();

interface AuthorRow {
	value: string;
	label: string;
}

function isAuthorRow(row: unknown): row is AuthorRow {
	return (
		typeof row === "object" &&
		row !== null &&
		"value" in row &&
		"label" in row &&
		typeof row.value === "string" &&
		typeof row.label === "string"
	);
}

const ROWS: AuthorRow[] = [
	{ value: "1", label: "Alice Smith" },
	{ value: "2", label: "Bob Jones" },
];

const Wrap = wrap(() => new Response("{}"));
const TRIGGER = '[data-testid="select-search-author_id"]';

interface ControlledRelationProps {
	onLoad: (ctx: unknown, value: string) => Promise<unknown>;
	initial: string;
}

function ControlledRelation({ onLoad, initial }: ControlledRelationProps) {
	const [value, setValue] = useState<string | null>(initial);
	return (
		<RelationForm
			name="author_id"
			value={value}
			onChange={setValue}
			options={{
				query: async () => ROWS,
				onLoad,
				optionLabel: (row: unknown) => (isAuthorRow(row) ? row.label : ""),
				optionValue: (row: unknown) => (isAuthorRow(row) ? row.value : ""),
			}}
		/>
	);
}

function makeOnLoad() {
	return mock(async (_ctx: unknown, value: string) => {
		const found = ROWS.find((r) => r.value === value);
		if (!found) {
			throw new Error("not found");
		}
		return found;
	});
}

async function selectSecondOption(container: HTMLElement, user: UserEvent) {
	const trigger = container.querySelector(TRIGGER);
	if (!(trigger instanceof HTMLElement)) {
		throw new Error("relation combobox input not rendered");
	}
	await user.click(trigger);
	await waitFor(() => {
		expect(document.body.querySelectorAll("[role='option']").length).toBeGreaterThan(1);
	});
	const second = document.body.querySelectorAll("[role='option']")[1];
	if (!(second instanceof HTMLElement)) {
		throw new Error("second option not rendered");
	}
	await user.click(second);
}

// A label the dropdown already listed is known, so re-resolving it costs a
// round-trip and flickers the control into <FormSkeleton />.
describe("relation re-resolve", () => {
	test("does not re-fetch a label the dropdown already carried", async () => {
		const user = userEvent.setup();
		const onLoad = makeOnLoad();
		const { container } = render(
			<Wrap>
				<ControlledRelation onLoad={onLoad} initial="1" />
			</Wrap>,
		);

		await waitFor(() => expect(container.textContent).toContain("Alice Smith"));
		expect(onLoad).toHaveBeenCalledTimes(1);
		await selectSecondOption(container, user);

		await waitFor(() => expect(container.textContent).toContain("Bob Jones"));
		expect(onLoad).toHaveBeenCalledTimes(1);
	});

	test("keeps the control rendered while a value change resolves", async () => {
		const user = userEvent.setup();
		const pending = Promise.withResolvers<unknown>();
		const onLoad = mock(async (_ctx: unknown, value: string) =>
			value === "1" ? ROWS[0] : pending.promise,
		);

		const { container } = render(
			<Wrap>
				<ControlledRelation onLoad={onLoad} initial="1" />
			</Wrap>,
		);
		await waitFor(() => expect(container.textContent).toContain("Alice Smith"));

		await selectSecondOption(container, user);

		expect(container.querySelector(TRIGGER)).not.toBeNull();
		pending.resolve(ROWS[1]);
	});
});
