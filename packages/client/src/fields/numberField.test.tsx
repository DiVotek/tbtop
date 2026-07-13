import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import { renderNode } from "../render/structureRenderer";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { NumberCell, NumberForm } from "./numberField";

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
});
