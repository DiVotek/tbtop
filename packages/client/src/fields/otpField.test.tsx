import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import { renderNode } from "../render/structureRenderer";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { OtpCell, OtpForm } from "./otpField";

// happy-dom can't drive focus/caret/paste — those are covered by the browser
// smoke pass. Here we assert slot count, default length, and cell masking.

const slotCount = (root: ParentNode): number =>
	root.querySelectorAll('[data-slot="input-otp-slot"]').length;

describe("Otp field", () => {
	test("renders six slots by default", async () => {
		const node = s.form({ query: async () => ({ code: "" }) }, [s.otp({ name: "code" })]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		expect(slotCount(container)).toBe(6);
	});

	test("length option controls the slot count", () => {
		const { container } = render(
			<OtpForm name="code" value="" onChange={() => {}} options={{ length: 4 }} />,
		);
		expect(slotCount(container)).toBe(4);
	});

	test("renders the current value into a single backing input", () => {
		const { container } = render(<OtpForm name="code" value="123" onChange={() => {}} />);
		const input = container.querySelector("input[name=code]") as HTMLInputElement | null;
		expect(input).not.toBeNull();
		expect(input?.value).toBe("123");
	});

	test("OtpCell masks one dot per character and renders nothing when empty", () => {
		const { container, rerender } = render(<OtpCell value="123456" />);
		expect(container.textContent).toBe("••••••");
		rerender(<OtpCell value="1234" />); // length-4 code masks to 4 dots, not 6
		expect(container.textContent).toBe("••••");
		rerender(<OtpCell value={null} />);
		expect(container.textContent).toBe("");
		rerender(<OtpCell value="" />);
		expect(container.textContent).toBe("");
	});
});
