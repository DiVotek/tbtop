/**
 * PageContentErrorBoundary: catches a render crash in the page content tree
 * (e.g. an invalid server-authored structure node) without taking down the
 * rest of the layout — the fallback card renders in place of the crash.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { PageContentErrorBoundary } from "./pageContentErrorBoundary";

function Bomb(): never {
	throw new Error("invalid SelectItem: value cannot be empty");
}

describe("PageContentErrorBoundary", () => {
	const originalError = console.error;
	beforeEach(() => {
		// React logs the caught error to console.error twice (dev warning +
		// error boundary log); silence it so the test output stays clean.
		console.error = () => {};
	});
	afterEach(() => {
		console.error = originalError;
	});

	test("renders children normally when nothing throws", () => {
		const { getByText, queryByTestId } = render(
			<PageContentErrorBoundary>
				<div>All good</div>
			</PageContentErrorBoundary>,
		);
		expect(getByText("All good")).toBeTruthy();
		expect(queryByTestId("page-content-error-boundary")).toBeNull();
	});

	test("a crashing child renders the fallback card instead of throwing past the boundary", () => {
		const { getByTestId, getByText } = render(
			<PageContentErrorBoundary>
				<Bomb />
			</PageContentErrorBoundary>,
		);
		expect(getByTestId("page-content-error-boundary")).toBeTruthy();
		expect(getByText("Something went wrong")).toBeTruthy();
		expect(getByText("invalid SelectItem: value cannot be empty")).toBeTruthy();
	});

	test("fallback card carries the destructive card classes", () => {
		const { getByTestId } = render(
			<PageContentErrorBoundary>
				<Bomb />
			</PageContentErrorBoundary>,
		);
		const card = getByTestId("page-content-error-boundary");
		expect(card.className).toContain("rounded-lg");
		expect(card.className).toContain("border-destructive/50");
		expect(card.className).toContain("bg-destructive/5");
	});

	test("Reload button calls window.location.reload", () => {
		const originalLocation = window.location;
		let calls = 0;
		Object.defineProperty(window, "location", {
			configurable: true,
			value: {
				...originalLocation,
				reload: () => {
					calls++;
				},
			},
		});

		const { getByTestId } = render(
			<PageContentErrorBoundary>
				<Bomb />
			</PageContentErrorBoundary>,
		);
		fireEvent.click(getByTestId("page-content-error-reload"));
		expect(calls).toBe(1);

		Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
	});

	test("siblings outside the boundary keep rendering when the child throws", () => {
		const { getByText, getByTestId } = render(
			<div>
				<div data-testid="sidebar">Sidebar</div>
				<PageContentErrorBoundary>
					<Bomb />
				</PageContentErrorBoundary>
			</div>,
		);
		expect(getByTestId("sidebar")).toBeTruthy();
		expect(getByText("Sidebar")).toBeTruthy();
		expect(getByTestId("page-content-error-boundary")).toBeTruthy();
	});
});
