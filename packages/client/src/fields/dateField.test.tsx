import { describe, expect, test } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { renderNode } from "../render/structureRenderer";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { DateCell, DateTimeCell, DateTimeForm } from "./dateField";

const ISO = "2026-05-17T14:30:00.000Z";

describe("Datetime field", () => {
	for (const resetValue of [null, "2027-01-02T09:15", "invalid"]) {
		test(`edited datetime follows form data reset to ${resetValue}`, () => {
			function Form() {
				const [value, setFormData] = useState<string | null>(ISO);
				return (
					<>
						<DateTimeForm name="publishedAt" value={value} onChange={setFormData} />
						<button type="button" onClick={() => setFormData(resetValue)}>
							Reset
						</button>
					</>
				);
			}
			const view = render(<Form />);
			const input = view.container.querySelector("input") as HTMLInputElement;
			fireEvent.change(input, { target: { value: "2026-06-18T16:45" } });
			expect(input.value).toBe("2026-06-18T16:45");
			fireEvent.click(view.getByRole("button", { name: "Reset" }));
			expect(input.value).toBe(resetValue === "invalid" ? "" : (resetValue ?? ""));
		});
	}

	test("Datetime form renders an <input type='datetime-local'>", async () => {
		const node = s.form({ query: async () => ({ publishedAt: null }) }, [
			s.datetime({ name: "publishedAt", label: "Published at" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		const input = container.querySelector('input[type="datetime-local"]');
		expect(input).not.toBeNull();
	});

	test("Datetime form with null initial value renders an empty input", () => {
		const { container } = render(
			<DateTimeForm name="publishedAt" value={null} onChange={() => {}} />,
		);
		const input = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
		expect(input.value).toBe("");
	});

	test("Datetime form with ISO initial value renders the local-timezone equivalent", () => {
		const { container } = render(
			<DateTimeForm name="publishedAt" value={ISO} onChange={() => {}} />,
		);
		const input = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
		const expected = (() => {
			const d = new Date(ISO);
			const pad = (n: number) => String(n).padStart(2, "0");
			return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
		})();
		expect(input.value).toBe(expected);
	});

	test("Datetime form typing a value emits an ISO 8601 UTC string through onChange", async () => {
		const captured: (string | null)[] = [];
		const user = userEvent.setup();
		const { container } = render(
			<DateTimeForm
				name="publishedAt"
				value={null}
				onChange={(next) => {
					captured.push(next);
				}}
			/>,
		);
		const input = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
		await user.type(input, "2026-05-17T17:30");
		const last = captured.at(-1);
		expect(typeof last).toBe("string");
		expect(last && last.endsWith("Z")).toBe(true);
		expect(last && !Number.isNaN(new Date(last).getTime())).toBe(true);
	});
});

describe("DatetimeCell", () => {
	test("DatetimeCell renders the locale string inside <time dateTime=ISO>", () => {
		const { container } = render(<DateTimeCell value={ISO} />);
		const time = container.querySelector("time");
		expect(time).not.toBeNull();
		expect(time?.getAttribute("dateTime")).toBe(ISO);
		expect(time?.textContent).toBe(new Date(ISO).toLocaleString());
	});

	test("DatetimeCell shows both date and time components (locale string)", () => {
		const { container } = render(<DateTimeCell value={ISO} />);
		const expected = new Date(ISO).toLocaleString();
		expect(container.textContent).toBe(expected);
		const dateOnly = new Date(ISO).toLocaleDateString();
		expect(expected).not.toBe(dateOnly);
	});

	test("DatetimeCell renders nothing for null", () => {
		const { container } = render(<DateTimeCell value={null} />);
		expect(container.textContent).toBe("");
	});

	test("Datetime form links its helper/error text via aria-describedby", () => {
		const { container } = render(
			<DateTimeForm
				name="publishedAt"
				value={null}
				onChange={() => {}}
				describedBy="publishedAt-error"
			/>,
		);
		const input = container.querySelector('input[type="datetime-local"]');
		expect(input?.getAttribute("aria-describedby")).toBe("publishedAt-error");
	});
});

describe("DateCell", () => {
	test("a Y-m-d value renders that calendar day, not UTC midnight shifted to local", () => {
		const { container } = render(<DateCell value="2026-03-05" />);
		const time = container.querySelector("time");
		expect(time?.getAttribute("dateTime")).toBe("2026-03-05");
		expect(time?.textContent).toBe(new Date(2026, 2, 5).toLocaleDateString());
	});
});
