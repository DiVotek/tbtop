import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { renderNode } from "../render/structureRenderer";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { NumberCell, NumberForm } from "./numberField";

function NumberHarness({ initial }: { initial: number | string | null }) {
	const [value, setValue] = useState<number | string | null>(initial);
	return (
		<>
			<NumberForm name="amount" value={value as number | null} onChange={setValue} />
			<button type="button" onClick={() => setValue(initial)}>
				reset
			</button>
		</>
	);
}

describe("Number field", () => {
	test("Number placeholder reaches the rendered input", async () => {
		const node = s.form({ query: async () => ({ rating: null }) }, [
			s.number({ name: "rating", placeholder: "0-10" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		const input = container.querySelector("input[name=rating]");
		expect(input?.getAttribute("placeholder")).toBe("0-10");
	});

	test("Number renders no placeholder attribute when option is unset", () => {
		const { container } = render(<NumberForm name="rating" value={null} onChange={() => {}} />);
		const input = container.querySelector("input[name=rating]");
		expect(input?.hasAttribute("placeholder")).toBe(false);
	});

	test("NumberCell renders the numeric value", () => {
		const { container } = render(<NumberCell value={42} />);
		expect(container.textContent).toBe("42");
	});

	test("NumberCell renders nothing for null value", () => {
		const { container } = render(<NumberCell value={null} />);
		expect(container.textContent).toBe("");
	});

	test("renders a numeric string value (Laravel decimal cast) instead of blanking the input", () => {
		const { container } = render(
			<NumberForm name="price" value={"1234.50" as unknown as number} onChange={() => {}} />,
		);
		const input = container.querySelector("input[name=price]") as HTMLInputElement;
		expect(input.value).toBe("1234.50");
	});

	test("a value prop change (e.g. rollback after a rejected save) updates the displayed input", async () => {
		const user = userEvent.setup();
		const { container, getByRole } = render(<NumberHarness initial={10} />);
		const input = container.querySelector("input[name=amount]") as HTMLInputElement;
		expect(input.value).toBe("10");

		// user types a new value that never gets confirmed by the server
		await user.clear(input);
		await user.type(input, "999");
		expect(input.value).toBe("999");

		// simulate a rejected save: parent rolls `value` back to the confirmed value
		await user.click(getByRole("button", { name: "reset" }));
		expect(input.value).toBe("10");
	});
});
