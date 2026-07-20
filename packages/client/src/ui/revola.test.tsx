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

	// Directional animation transforms compose with Tailwind 4's independent
	// centering translate, making the dialog enter from above and left. Centered
	// dialogs should remain centered while fading and scaling into place.
	test("desktop dialog content uses centered fade and scale animation", () => {
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
		// Static translate positions the dialog; animation must not add movement.
		expect(cls).toMatch(/translate-x-\[-50%\]|-translate-x-1\/2/);
		expect(cls).toMatch(/translate-y-\[-50%\]|-translate-y-1\/2/);
		expect(cls).not.toContain("slide-in-from");
		expect(cls).not.toContain("slide-out-to");
		expect(cls).toContain("data-[state=open]:zoom-in-[97%]");
		expect(cls).toContain("data-[state=closed]:zoom-out-[98%]");
		expect(cls).toContain("motion-reduce:animate-none");
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
