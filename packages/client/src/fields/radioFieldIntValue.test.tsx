import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { RadioCell, RadioForm } from "./radioField";

describe("Radio field with int-backed values", () => {
	test("Radio checks the option for an int-backed record value", () => {
		const choices = [
			{ value: "1", label: "Draft" },
			{ value: "2", label: "Published" },
		];
		const { container } = render(
			<RadioForm
				name="status"
				value={2 as unknown as string}
				onChange={() => {}}
				options={{ options: choices }}
			/>,
		);
		const items = container.querySelectorAll('[data-slot="radio-group-item"]');
		expect(items[0]?.getAttribute("data-state")).toBe("unchecked");
		expect(items[1]?.getAttribute("data-state")).toBe("checked");
	});

	test("RadioCell resolves the label for an int-backed value", () => {
		const choices = [{ value: "2", label: "Published" }];
		const { container } = render(
			<RadioCell value={2 as unknown as string} options={{ options: choices }} />,
		);
		expect(container.textContent).toBe("Published");
	});
});
