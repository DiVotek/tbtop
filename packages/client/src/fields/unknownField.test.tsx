import { describe, expect, mock, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { UnknownForm } from "./unknownField";

describe("UnknownForm", () => {
	test("updates the serialized display when the controlled value changes", () => {
		const { getByRole, rerender } = render(
			<UnknownForm name="payload" value={{ state: "first" }} onChange={() => {}} />,
		);
		const input = getByRole("textbox") as HTMLInputElement;
		expect(input.value).toBe('{"state":"first"}');

		rerender(<UnknownForm name="payload" value={{ state: "second" }} onChange={() => {}} />);
		expect(input.value).toBe('{"state":"second"}');
	});

	test("forwards disabled, blur, and validation accessibility props", () => {
		const onBlur = mock(() => {});
		const { getByRole } = render(
			<UnknownForm
				name="payload"
				value={null}
				onChange={() => {}}
				onBlur={onBlur}
				disabled
				invalid
				describedBy="payload-error"
			/>,
		);
		const input = getByRole("textbox") as HTMLInputElement;
		expect(input.disabled).toBe(true);
		expect(input.getAttribute("aria-invalid")).toBe("true");
		expect(input.getAttribute("aria-describedby")).toBe("payload-error");

		fireEvent.blur(input);
		expect(onBlur).toHaveBeenCalledTimes(1);
	});
});
