import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderNode } from "../render/structureRenderer";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { DateTimeCell, DateTimeForm } from "./dateField";

const ISO = "2026-05-17T14:30:00.000Z";

describe("Datetime field", () => {
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
});
