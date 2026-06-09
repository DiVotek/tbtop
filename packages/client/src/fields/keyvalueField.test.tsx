import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderNode } from "../render/structureRenderer";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { KeyvalueCell, KeyvalueForm } from "./keyvalueField";

describe("Keyvalue field", () => {
	test("Keyvalue renders key and value inputs plus a remove button per row", () => {
		const { getAllByRole } = render(
			<KeyvalueForm name="meta" value={{ env: "prod" }} onChange={() => {}} />,
		);
		const keyInputs = getAllByRole("textbox", { name: "Key" });
		const valueInputs = getAllByRole("textbox", { name: "Value" });
		expect(keyInputs).toHaveLength(1);
		expect(valueInputs).toHaveLength(1);
		expect(getAllByRole("button", { name: "Remove row" })).toHaveLength(1);
	});

	test("Keyvalue renders an Add row button", () => {
		const { getByRole } = render(<KeyvalueForm name="meta" value={null} onChange={() => {}} />);
		expect(getByRole("button", { name: "Add row" })).not.toBeNull();
	});

	test("Keyvalue typing key and value emits the correct bag via onChange", async () => {
		const user = userEvent.setup();
		const captured: (Record<string, string> | null)[] = [];
		const { getAllByRole, getByRole } = render(
			<KeyvalueForm
				name="meta"
				value={null}
				onChange={(next) => {
					captured.push(next);
				}}
			/>,
		);
		await user.click(getByRole("button", { name: "Add row" }));
		const keys = getAllByRole("textbox", { name: "Key" });
		const values = getAllByRole("textbox", { name: "Value" });
		await user.type(keys[0] as HTMLInputElement, "env");
		await user.type(values[0] as HTMLInputElement, "prod");
		const last = captured.at(-1) as Record<string, string>;
		expect(last.env).toBe("prod");
	});

	test("Keyvalue editing a key renames the entry and removes the old key", async () => {
		const user = userEvent.setup();
		const captured: (Record<string, string> | null)[] = [];
		const { getAllByRole } = render(
			<KeyvalueForm
				name="meta"
				value={{ env: "prod" }}
				onChange={(next) => {
					captured.push(next);
				}}
			/>,
		);
		const keyInput = getAllByRole("textbox", { name: "Key" })[0] as HTMLInputElement;
		await user.clear(keyInput);
		await user.type(keyInput, "environment");
		const last = captured.at(-1) as Record<string, string>;
		expect(last.environment).toBe("prod");
		expect("env" in last).toBe(false);
	});

	test("Keyvalue duplicate keys show a non-blocking inline warning", async () => {
		const user = userEvent.setup();
		const { getAllByRole, getByRole, getAllByText } = render(
			<KeyvalueForm name="meta" value={{ env: "prod" }} onChange={() => {}} />,
		);
		await user.click(getByRole("button", { name: "Add row" }));
		const keys = getAllByRole("textbox", { name: "Key" });
		await user.type(keys[1] as HTMLInputElement, "env");
		const warnings = getAllByText(/Duplicate key 'env'/);
		expect(warnings.length).toBeGreaterThan(0);
	});

	test("Keyvalue removing a row drops the key from the emitted bag", async () => {
		const user = userEvent.setup();
		const captured: (Record<string, string> | null)[] = [];
		const { getAllByRole } = render(
			<KeyvalueForm
				name="meta"
				value={{ env: "prod", region: "us" }}
				onChange={(next) => {
					captured.push(next);
				}}
			/>,
		);
		const removeButtons = getAllByRole("button", { name: "Remove row" });
		await user.click(removeButtons[0] as HTMLButtonElement);
		const last = captured.at(-1) as Record<string, string>;
		expect(Object.keys(last)).toHaveLength(1);
	});

	test("Keyvalue removing the last row emits an empty object not null", async () => {
		const user = userEvent.setup();
		const captured: (Record<string, string> | null)[] = [];
		const { getByRole } = render(
			<KeyvalueForm
				name="meta"
				value={{ env: "prod" }}
				onChange={(next) => {
					captured.push(next);
				}}
			/>,
		);
		await user.click(getByRole("button", { name: "Remove row" }));
		expect(captured.at(-1)).toEqual({});
	});

	test("Keyvalue null value seeds an empty row list", () => {
		const { queryAllByRole } = render(
			<KeyvalueForm name="meta" value={null} onChange={() => {}} />,
		);
		expect(queryAllByRole("button", { name: "Remove row" })).toHaveLength(0);
	});

	test("Keyvalue form-block wraps label and required marker", async () => {
		const node = s.form({ query: async () => ({ meta: { env: "prod" } }) }, [
			s.keyvalue({ name: "meta", label: "Metadata", required: true }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		const label = container.querySelector("label");
		expect(label?.textContent).toContain("Metadata");
		expect(label?.querySelector("span.text-destructive")?.textContent).toBe("*");
	});
	test("Keyvalue wires the first key input to the field id so a label[htmlFor] focuses it", () => {
		const { getAllByRole } = render(
			<KeyvalueForm
				id="meta-field"
				name="meta"
				value={{ env: "prod" }}
				onChange={() => {}}
			/>,
		);
		const firstKey = getAllByRole("textbox", { name: "Key" })[0] as HTMLInputElement;
		expect(firstKey.id).toBe("meta-field");
	});

	test("Keyvalue resyncs row list when value changes externally (e.g. form reset)", () => {
		const { getAllByRole, rerender } = render(
			<KeyvalueForm name="meta" value={{ env: "prod" }} onChange={() => {}} />,
		);
		expect(getAllByRole("textbox", { name: "Key" })).toHaveLength(1);
		rerender(
			<KeyvalueForm name="meta" value={{ region: "us", tier: "pro" }} onChange={() => {}} />,
		);
		const keys = getAllByRole("textbox", { name: "Key" }) as HTMLInputElement[];
		expect(keys).toHaveLength(2);
		expect(keys.map((k) => k.value).sort()).toEqual(["region", "tier"]);
	});
});

describe("KeyvalueCell", () => {
	test("KeyvalueCell renders comma-separated key=value pairs", () => {
		const { container } = render(<KeyvalueCell value={{ env: "prod", region: "us" }} />);
		const text = container.textContent ?? "";
		expect(text).toContain("env=prod");
		expect(text).toContain("region=us");
	});

	test("KeyvalueCell renders empty for null value", () => {
		const { container } = render(<KeyvalueCell value={null} />);
		expect(container.textContent).toBe("");
	});

	test("KeyvalueCell renders empty for empty object", () => {
		const { container } = render(<KeyvalueCell value={{}} />);
		expect(container.textContent).toBe("");
	});
});
