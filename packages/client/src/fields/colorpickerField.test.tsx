import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderNode } from "../render/structureRenderer";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { ColorpickerCell, ColorpickerForm } from "./colorpickerField";

describe("Colorpicker field", () => {
	test("Colorpicker renders the hex picker and a palette swatch per entry", () => {
		const palette = ["#ff0000", "#00ff00", "#0000ff"];
		const { container, getAllByRole } = render(
			<ColorpickerForm
				name="brand"
				value="#ff0000"
				onChange={() => {}}
				options={{ palette }}
			/>,
		);
		expect(container.querySelector(".react-colorful")).not.toBeNull();
		expect(getAllByRole("option")).toHaveLength(3);
	});

	test("Colorpicker swatch click emits the swatch hex through onChange", async () => {
		const user = userEvent.setup();
		const captured: (string | null)[] = [];
		const { getByRole } = render(
			<ColorpickerForm
				name="brand"
				value="#ffffff"
				onChange={(next) => {
					captured.push(next);
				}}
				options={{ palette: ["#ff0000", "#00ff00"] }}
			/>,
		);
		await user.click(getByRole("option", { name: "#00ff00" }));
		expect(captured.at(-1)).toBe("#00ff00");
	});

	test("Colorpicker swaps to the alpha picker when value is an 8-char hex", () => {
		const { container, rerender } = render(
			<ColorpickerForm name="brand" value="#ff0000" onChange={() => {}} />,
		);
		const sixCharNodes = container.querySelectorAll(".react-colorful__alpha");
		expect(sixCharNodes).toHaveLength(0);
		rerender(<ColorpickerForm name="brand" value="#ff000080" onChange={() => {}} />);
		const eightCharNodes = container.querySelectorAll(".react-colorful__alpha");
		expect(eightCharNodes.length).toBeGreaterThan(0);
	});

	test("Colorpicker hides the palette listbox when no palette is configured", () => {
		const { queryByRole } = render(
			<ColorpickerForm name="brand" value="#ffffff" onChange={() => {}} />,
		);
		expect(queryByRole("listbox")).toBeNull();
	});

	test("Colorpicker renders an empty picker when value is null", () => {
		const { container } = render(
			<ColorpickerForm name="brand" value={null} onChange={() => {}} />,
		);
		expect(container.querySelector(".react-colorful")).not.toBeNull();
	});

	test("ColorpickerCell renders a swatch and the hex code in monospace", () => {
		const { container, getByText } = render(<ColorpickerCell value="#abcdef" />);
		expect(getByText("#abcdef").className).toContain("font-mono");
		const swatch = container.querySelector('span[aria-hidden="true"]') as HTMLElement | null;
		expect(swatch).not.toBeNull();
		expect(swatch?.style.backgroundColor).not.toBe("");
	});

	test("ColorpickerCell renders empty for null or empty value", () => {
		const { container, rerender } = render(<ColorpickerCell value={null} />);
		expect(container.textContent).toBe("");
		rerender(<ColorpickerCell value="" />);
		expect(container.textContent).toBe("");
	});

	test("Colorpicker form-block wraps label and required marker, component renders only the picker group", async () => {
		const node = s.form({ query: async () => ({ brand: "#ff0000" }) }, [
			s.colorpicker({ name: "brand", label: "Brand", required: true }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		const label = container.querySelector("label");
		expect(label?.textContent).toContain("Brand");
		expect(label?.querySelector("span.text-destructive")?.textContent).toBe("*");
	});
});
