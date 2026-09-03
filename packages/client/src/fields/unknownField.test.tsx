import { describe, expect, mock, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { useState } from "react";
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

	test("typing through a controlled parent does not re-stringify the draft", () => {
		function Harness() {
			const [value, setValue] = useState<unknown>({ a: 1 });
			return <UnknownForm name="payload" value={value} onChange={setValue} />;
		}

		const { getByRole } = render(<Harness />);
		const input = getByRole("textbox") as HTMLInputElement;
		expect(input.value).toBe('{"a":1}');

		fireEvent.change(input, { target: { value: '{"a":12}' } });
		expect(input.value).toBe('{"a":12}');

		fireEvent.change(input, { target: { value: '{"a":12' } });
		expect(input.value).toBe('{"a":12');
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
