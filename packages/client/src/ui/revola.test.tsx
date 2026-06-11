import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogTitle } from "./revola";

// Helpers to build a mock MediaQueryList that can be triggered externally.
type MqlListener = (e: MediaQueryListEvent) => void;

interface MockMql {
	matches: boolean;
	addEventListener: (type: string, fn: MqlListener) => void;
	removeEventListener: (type: string, fn: MqlListener) => void;
	dispatchChange: (matches: boolean) => void;
}

function makeMockMql(initialMatches: boolean): MockMql {
	const listeners: MqlListener[] = [];
	const mql: MockMql = {
		matches: initialMatches,
		addEventListener(_type: string, fn: MqlListener) {
			listeners.push(fn);
		},
		removeEventListener(_type: string, fn: MqlListener) {
			const idx = listeners.indexOf(fn);
			if (idx !== -1) {
				listeners.splice(idx, 1);
			}
		},
		dispatchChange(nextMatches: boolean) {
			mql.matches = nextMatches;
			for (const fn of listeners) {
				fn({ matches: nextMatches } as MediaQueryListEvent);
			}
		},
	};
	return mql;
}

describe("ResponsiveDialog", () => {
	let mql: MockMql;
	let matchMediaSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		// Start as desktop (isDesktop = null → we need matchMedia listener to fire).
		mql = makeMockMql(false);
		matchMediaSpy = spyOn(window, "matchMedia").mockReturnValue(
			mql as unknown as MediaQueryList,
		);
	});

	afterEach(() => {
		try {
			matchMediaSpy.mockRestore();
		} finally {
			// ensure cleanup even if restore throws
		}
	});

	test("ResponsiveDialog: renders content when open without crashing", () => {
		const { getByText } = render(
			<ResponsiveDialog open={true}>
				<ResponsiveDialogContent>
					<ResponsiveDialogTitle>Hello</ResponsiveDialogTitle>
				</ResponsiveDialogContent>
			</ResponsiveDialog>,
		);
		expect(getByText("Hello")).toBeTruthy();
	});

	test("ResponsiveDialog: onlyDialog bypasses media query and renders immediately", () => {
		// onlyDialog=true skips the isDesktop null guard entirely — content must appear
		// even when matchMedia is present, proving the guard only fires on the responsive path.
		const { getByText } = render(
			<ResponsiveDialog open={true} onlyDialog={true}>
				<ResponsiveDialogContent>
					<ResponsiveDialogTitle>Always dialog</ResponsiveDialogTitle>
				</ResponsiveDialogContent>
			</ResponsiveDialog>,
		);
		expect(getByText("Always dialog")).toBeTruthy();
	});

	// Regression: without slide-in-from-top-[48%] the modal only animates along
	// the x axis (slides in from the left edge instead of popping from center).
	// Both slide-in-from-left-1/2 AND slide-in-from-top-[48%] must be present:
	//   - slide-in-from-left-1/2 sets --tw-enter-translate-x: -50%
	//   - slide-in-from-top-[48%] sets --tw-enter-translate-y: -48%
	// Together they make the animation keyframe start at (center-50%, center-48%),
	// matching the translate-x(-50%) translate-y(-50%) final position → the modal
	// appears to pop in from the center rather than sliding in from the left edge.
	test("desktop dialog content carries the centering animation class set", () => {
		const { baseElement } = render(
			<ResponsiveDialog open={true} onlyDialog={true}>
				<ResponsiveDialogContent>
					<ResponsiveDialogTitle>Centered</ResponsiveDialogTitle>
				</ResponsiveDialogContent>
			</ResponsiveDialog>,
		);
		const content = baseElement.querySelector('[role="dialog"]');
		const cls = content?.className ?? "";
		// Positioning: fixed centering via left/top + negative translate pair
		expect(cls).toContain("left-1/2");
		expect(cls).toContain("top-1/2");
		// Static translate must be present for the animation origin to resolve correctly
		expect(cls).toMatch(/translate-x-\[-50%\]|-translate-x-1\/2/);
		expect(cls).toMatch(/translate-y-\[-50%\]|-translate-y-1\/2/);
		// Both slide-in classes required: left-1/2 alone causes left-edge entry
		expect(cls).toContain("data-[state=open]:slide-in-from-left-1/2");
		expect(cls).toContain("data-[state=open]:slide-in-from-top-[48%]");
		// zoom-in for scale entrance
		expect(cls).toContain("data-[state=open]:zoom-in-95");
	});

	test("ResponsiveDialog: media query flip does not crash and content remains present", async () => {
		// Start on mobile (isDesktop = false), flip to desktop mid-tree.
		mql = makeMockMql(false);
		matchMediaSpy.mockReturnValue(mql as unknown as MediaQueryList);

		const { getByText } = render(
			<ResponsiveDialog open={true}>
				<ResponsiveDialogContent>
					<ResponsiveDialogTitle>Dialog content</ResponsiveDialogTitle>
				</ResponsiveDialogContent>
			</ResponsiveDialog>,
		);

		// Fire the media query change — this is what triggers the mid-tree crash.
		await act(async () => {
			mql.dispatchChange(true);
		});

		await waitFor(() => {
			expect(getByText("Dialog content")).toBeTruthy();
		});
	});
});
