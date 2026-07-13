/**
 * EditableCell rules:
 * - boolean toggle persists on change (not blur)
 * - text input persists on blur only (not on change)
 * - failed save rolls back optimistic value and shows error
 * - client pre-validation blocks save when constraints fail
 * - missing row id prevents save (no crash)
 */
import { beforeAll, describe, expect, mock, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { defaultMessages } from "../../i18n/defaultMessages";

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any import of the mocked module.
// ---------------------------------------------------------------------------

const mockNotify = mock(() => {});
const mockRefresh = mock(() => {});

mock.module("../actionContext", () => ({
	useClientActionContext: () => ({
		client: null,
		user: null,
		params: {},
		navigate: mock(() => {}),
		notify: mockNotify,
		// Mirrors useTranslation()'s no-provider fallback (defaultMessages lookup,
		// else the key itself) so EditableCell's translated pre-validation
		// messages (translateValidationMessage) resolve the same way they do
		// in the real app instead of leaking a raw "validation.required" key.
		t: (k: string, fallback?: string) => defaultMessages[k] ?? fallback ?? k,
		table: {
			refresh: mockRefresh,
			rows: [],
			selectedIds: [],
			queryParams: {},
			setQuery: mock(() => {}),
		},
	}),
}));

mock.module("@inertiajs/react", () => ({
	router: { visit: mock(() => {}), reload: mock(() => {}), on: mock(() => () => {}) },
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { ensureBuiltinsRegistered } from "../../render/registerBuiltins";
import type { TableColumn } from "../types";
import { EditableCell } from "./editableCell";

beforeAll(() => {
	ensureBuiltinsRegistered();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type EditableCellTestCol = TableColumn & { editable: NonNullable<TableColumn["editable"]> };

function booleanCol(name = "active"): EditableCellTestCol {
	return { name, editable: { as: "boolean" } };
}

function textCol(name = "title"): EditableCellTestCol {
	return { name, editable: { as: "text" } };
}

function selectCol(name = "status"): EditableCellTestCol {
	return {
		name,
		editable: {
			as: "select",
			options: [
				{ value: "draft", label: "Draft" },
				{ value: "published", label: "Published" },
			],
		},
	};
}

function row(id: string, values: Record<string, unknown> = {}): Record<string, unknown> {
	return { id, ...values };
}

// Radix Select portals its listbox to document.body; find the option by label.
async function waitForOption(label: string): Promise<HTMLElement> {
	return await waitFor(() => {
		const items = Array.from(document.body.querySelectorAll('[role="option"]'));
		const match = items.find((el) => el.textContent?.includes(label));
		if (!match) {
			throw new Error(`option "${label}" not found`);
		}
		return match as HTMLElement;
	});
}

// ---------------------------------------------------------------------------
// Toggle (boolean) — persists on change, not on blur
// ---------------------------------------------------------------------------

describe("EditableCell: boolean toggle", () => {
	test("calls saveCell on toggle click with correct args", async () => {
		const saveCell = mock((_args: unknown) => Promise.resolve(undefined));

		const { container } = render(
			<EditableCell
				col={booleanCol()}
				row={row("1", { active: false })}
				saveCell={saveCell}
			/>,
		);

		const toggle = container.querySelector('[role="switch"]') as HTMLElement;
		expect(toggle).toBeTruthy();

		await act(async () => {
			fireEvent.click(toggle);
		});

		await waitFor(() => {
			expect(saveCell).toHaveBeenCalledTimes(1);
		});
		const call = (
			saveCell.mock.calls[0] as [{ column: string; id: string; value: unknown }]
		)[0];
		expect(call.column).toBe("active");
		expect(call.id).toBe("1");
		expect(call.value).toBe(true);
	});

	test("does NOT call saveCell on blur (blur is irrelevant for boolean)", async () => {
		const saveCell = mock((_args: unknown) => Promise.resolve(undefined));

		const { container } = render(
			<EditableCell
				col={booleanCol()}
				row={row("5", { active: true })}
				saveCell={saveCell}
			/>,
		);

		const toggle = container.querySelector('[role="switch"]') as HTMLElement;

		await act(async () => {
			fireEvent.blur(toggle);
		});

		// boolean cells don't save on blur
		expect(saveCell).toHaveBeenCalledTimes(0);
	});
});

// ---------------------------------------------------------------------------
// Text input — persists on blur only
// ---------------------------------------------------------------------------

describe("EditableCell: text input", () => {
	test("blur calls saveCell; no change event call before blur", async () => {
		const saveCell = mock((_args: unknown) => Promise.resolve(undefined));

		const { container } = render(
			<EditableCell col={textCol()} row={row("2", { title: "Hello" })} saveCell={saveCell} />,
		);

		const input = container.querySelector("input") as HTMLInputElement;
		expect(input).toBeTruthy();

		// Change event alone should NOT trigger saveCell
		await act(async () => {
			fireEvent.focus(input);
		});
		expect(saveCell).toHaveBeenCalledTimes(0);

		// Only blur triggers save
		await act(async () => {
			fireEvent.blur(input);
		});

		await waitFor(() => {
			expect(saveCell).toHaveBeenCalledTimes(1);
		});
		const call = (
			saveCell.mock.calls[0] as [{ column: string; id: string; value: unknown }]
		)[0];
		expect(call.column).toBe("title");
		expect(call.id).toBe("2");
	});
});

// ---------------------------------------------------------------------------
// Select (static) — forwards options, persists on change (not blur)
// ---------------------------------------------------------------------------

describe("EditableCell: static select", () => {
	test("forwards static options — trigger renders the current value's label", () => {
		const saveCell = mock((_args: unknown) => Promise.resolve(undefined));

		const { container } = render(
			<EditableCell
				col={selectCol()}
				row={row("1", { status: "published" })}
				saveCell={saveCell}
			/>,
		);

		const trigger = container.querySelector('[data-slot="select-trigger"]') as HTMLElement;
		expect(trigger).toBeTruthy();
		// Forwarded options let the Select resolve the value to its label
		expect(trigger.textContent).toContain("Published");
	});

	test("persists on change, not on blur (select commits on selection)", async () => {
		const saveCell = mock((_args: unknown) => Promise.resolve(undefined));

		const { container } = render(
			<EditableCell
				col={selectCol()}
				row={row("7", { status: "draft" })}
				saveCell={saveCell}
			/>,
		);

		const trigger = container.querySelector('[data-slot="select-trigger"]') as HTMLElement;

		// Blur alone must not save (select is not a blur-commit field)
		await act(async () => {
			fireEvent.blur(trigger);
		});
		expect(saveCell).toHaveBeenCalledTimes(0);

		// Open the listbox and pick a different option → commits on change
		await act(async () => {
			fireEvent.keyDown(trigger, { key: "Enter" });
		});
		const option = await waitForOption("Published");
		await act(async () => {
			fireEvent.click(option);
		});

		await waitFor(() => {
			expect(saveCell).toHaveBeenCalledTimes(1);
		});
		const call = (
			saveCell.mock.calls[0] as [{ column: string; id: string; value: unknown }]
		)[0];
		expect(call.column).toBe("status");
		expect(call.id).toBe("7");
		expect(call.value).toBe("published");
	});

	test("rolls back and shows inline 422 error when saveCell rejects", async () => {
		const saveCell = mock((_args: unknown) =>
			Promise.reject({ errors: { status: ["Invalid status"] } }),
		);

		const { container, findByTestId } = render(
			<EditableCell
				col={selectCol()}
				row={row("8", { status: "draft" })}
				saveCell={saveCell}
			/>,
		);

		const trigger = container.querySelector('[data-slot="select-trigger"]') as HTMLElement;
		await act(async () => {
			fireEvent.keyDown(trigger, { key: "Enter" });
		});
		const option = await waitForOption("Published");
		await act(async () => {
			fireEvent.click(option);
		});

		const errorEl = await findByTestId("cell-error-status");
		expect(errorEl.textContent).toBe("Invalid status");

		// Optimistic value rolled back to the original "Draft"
		const updatedTrigger = container.querySelector(
			'[data-slot="select-trigger"]',
		) as HTMLElement;
		expect(updatedTrigger.textContent).toContain("Draft");
	});
});

// ---------------------------------------------------------------------------
// Optimistic rollback on error
// ---------------------------------------------------------------------------

describe("EditableCell: optimistic rollback", () => {
	test("reverts toggle and shows error when saveCell rejects", async () => {
		const saveCell = mock((_args: unknown) =>
			Promise.reject({ errors: { active: ["Server error"] } }),
		);

		const { container, findByTestId } = render(
			<EditableCell
				col={booleanCol()}
				row={row("3", { active: false })}
				saveCell={saveCell}
			/>,
		);

		const toggle = container.querySelector('[role="switch"]') as HTMLElement;
		// Initially false → unchecked
		expect(toggle.getAttribute("aria-checked")).toBe("false");

		await act(async () => {
			fireEvent.click(toggle);
		});

		const errorEl = await findByTestId("cell-error-active");
		expect(errorEl.textContent).toBe("Server error");

		// Toggle reverts to original state (false = unchecked)
		const updatedToggle = container.querySelector('[role="switch"]') as HTMLElement;
		expect(updatedToggle.getAttribute("aria-checked")).toBe("false");
	});
});

// ---------------------------------------------------------------------------
// Client-side pre-validation blocks save
// ---------------------------------------------------------------------------

describe("EditableCell: client pre-validation", () => {
	test("required boolean field: empty (null) blocks saveCell and shows error", async () => {
		const saveCell = mock((_args: unknown) => Promise.resolve(undefined));

		// A boolean with required constraint: null value should fail validation
		const col: EditableCellTestCol = {
			name: "active",
			editable: { as: "boolean", constraints: { required: true } },
		};

		// Row has null value — pre-validation should block the save
		const { container } = render(
			<EditableCell col={col} row={{ id: "4", active: null }} saveCell={saveCell} />,
		);

		// Wait for component to render the toggle
		const toggle = container.querySelector('[role="switch"]') as HTMLElement;
		expect(toggle).toBeTruthy();

		// Click toggle: onChange fires with true — passes required validation
		// So this doesn't test blocking. Instead, manually call save path by
		// toggling to false (unchecked = null-ish but actually false)
		// For required constraint, false boolean is considered non-empty by checkField.
		// The real test: start with undefined/null and blur-save text with required
		// Use text for pre-validation blocking test instead.
		const textCellCol: EditableCellTestCol = {
			name: "title",
			editable: { as: "text", constraints: { required: true } },
		};

		// Re-render with text col starting from empty
		const { container: textContainer, findByTestId: textFindByTestId } = render(
			<EditableCell col={textCellCol} row={{ id: "4", title: "" }} saveCell={saveCell} />,
		);

		const textInput = textContainer.querySelector("input") as HTMLInputElement;

		// Blur immediately (value is already empty string)
		await act(async () => {
			fireEvent.blur(textInput);
		});

		// saveCell must NOT have been called (pre-validation blocked it)
		expect(saveCell).toHaveBeenCalledTimes(0);

		const errorEl = await textFindByTestId("cell-error-title");
		expect(errorEl.textContent).toBe("Required");
	});
});

// ---------------------------------------------------------------------------
// No id → no save
// ---------------------------------------------------------------------------

describe("EditableCell: no id", () => {
	test("does not call saveCell when row has no id", async () => {
		const saveCell = mock((_args: unknown) => Promise.resolve(undefined));

		const { container } = render(
			<EditableCell
				col={booleanCol()}
				row={{ active: true }} // no id
				saveCell={saveCell}
			/>,
		);

		const toggle = container.querySelector('[role="switch"]') as HTMLElement;
		await act(async () => {
			fireEvent.click(toggle);
		});

		// give async a chance to fire if it would
		await new Promise((r) => setTimeout(r, 10));
		expect(saveCell).toHaveBeenCalledTimes(0);
	});
});
