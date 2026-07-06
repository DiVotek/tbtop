/**
 * ModalShell layout regression tests + ConfirmDialog behavioral tests.
 *
 * ModalShell layout contracts:
 *   - canonical p-6 padding on the content element
 *   - flex-column content with a scrollable min-h-0 body region
 *   - scrollbar chrome hidden on the scrollable body (scrollbar-none utility)
 *   - content on the shared z-50 floating layer (not z-[9999])
 *
 * ConfirmDialog behavioral contracts:
 *   - onConfirm fires when the confirm button is clicked
 *   - dialog closes (onOpenChange(false)) when cancel is clicked
 */
import { describe, expect, mock, test } from "bun:test";
import { act, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "../i18n/i18n";
import { ConfirmDialog, ModalShell } from "./modal-shell";

function wrap(ui: React.ReactNode) {
	return <I18nProvider defaultLang="en">{ui}</I18nProvider>;
}

describe("ModalShell", () => {
	// Regression: p-6 lived on the old DialogContent and was lost in the
	// revola migration (0a8d66d) — every dialog rendered edge-to-edge.
	test("content carries the canonical outer padding", () => {
		const { baseElement } = render(
			wrap(
				<ModalShell open onOpenChange={() => {}} title="Title" onlyDialog>
					<p>body</p>
				</ModalShell>,
			),
		);
		const content = baseElement.querySelector('[role="dialog"]');
		expect(content?.className ?? "").toContain("p-6");
	});

	// Regression: tall dialog bodies (media picker) overflowed the viewport.
	// Scroll contract: content is a flex column capped by max-h; the body row
	// must carry min-h-0 + overflow-y-auto to shrink and scroll.
	test("body is the scrollable region inside a flex-column content", () => {
		const { baseElement } = render(
			wrap(
				<ModalShell open onOpenChange={() => {}} title="Title" onlyDialog>
					<p>body</p>
				</ModalShell>,
			),
		);
		const content = baseElement.querySelector('[role="dialog"]');
		expect(content?.className ?? "").toContain("flex-col");
		const body = content?.querySelector(".overflow-y-auto");
		expect(body).not.toBeNull();
		expect(body?.className ?? "").toContain("min-h-0");
	});

	// Parity with shadcn/radix Dialog: the scrollable body must hide the
	// scrollbar chrome while remaining scrollable. The scrollbar-none utility
	// in styles.css applies scrollbar-width:none + ::-webkit-scrollbar{display:none}.
	test("scrollable body carries scrollbar-none to hide the scrollbar chrome", () => {
		const { baseElement } = render(
			wrap(
				<ModalShell open onOpenChange={() => {}} title="Title" onlyDialog>
					<p>body</p>
				</ModalShell>,
			),
		);
		const content = baseElement.querySelector('[role="dialog"]');
		const body = content?.querySelector(".overflow-y-auto");
		expect(body?.className ?? "").toContain("scrollbar-none");
	});

	// Regression: revola hiked dialog content to z-[9999]; radix Select and
	// DropdownMenu popovers portal at z-50 and rendered BEHIND the modal —
	// selects inside the filters modal looked like they never opened.
	test("content stays on the shared z-50 floating layer", () => {
		const { baseElement } = render(
			wrap(
				<ModalShell open onOpenChange={() => {}} title="Title" onlyDialog>
					<p>body</p>
				</ModalShell>,
			),
		);
		const content = baseElement.querySelector('[role="dialog"]');
		const classes = content?.className ?? "";
		expect(classes).toContain("z-50");
		expect(classes).not.toMatch(/z-\[\d+\]/);
	});

	test.each([
		["xl", "sm:max-w-xl"],
		["2xl", "sm:max-w-2xl"],
		["3xl", "sm:max-w-3xl"],
		["4xl", "sm:max-w-4xl"],
		["5xl", "sm:max-w-5xl"],
		["6xl", "sm:max-w-6xl"],
		["7xl", "sm:max-w-7xl"],
	] as const)("extended size %s applies %s on the dialog content", (size, expectedClass) => {
		const { baseElement } = render(
			wrap(
				<ModalShell open onOpenChange={() => {}} title="Title" size={size} onlyDialog>
					<p>body</p>
				</ModalShell>,
			),
		);
		const content = baseElement.querySelector('[role="dialog"]');
		expect(content?.className ?? "").toContain(expectedClass);
	});

	test("slideOver renders as a right-anchored, edge-flush panel", () => {
		const { baseElement } = render(
			wrap(
				<ModalShell open onOpenChange={() => {}} title="Title" slideOver>
					<p>body</p>
				</ModalShell>,
			),
		);
		const content = baseElement.querySelector('[role="dialog"]');
		const classes = content?.className ?? "";
		expect(classes).toContain("right-0");
		expect(classes).toContain("inset-y-0");
		expect(classes).not.toContain("right-2");
	});
});

describe("ConfirmDialog", () => {
	test("calls onConfirm when confirm button is clicked", async () => {
		const user = userEvent.setup({ delay: null });
		const onConfirm = mock(() => {});
		const onOpenChange = mock(() => {});

		const { getByTestId } = render(
			wrap(
				<ConfirmDialog
					open={true}
					onOpenChange={onOpenChange}
					title="Delete record?"
					onConfirm={onConfirm}
				/>,
			),
		);

		await act(async () => {
			await user.click(getByTestId("confirm-dialog-confirm"));
		});

		expect(onConfirm).toHaveBeenCalledTimes(1);
	});

	test("calls onOpenChange(false) when cancel button is clicked", async () => {
		const user = userEvent.setup({ delay: null });
		const onConfirm = mock(() => {});
		const onOpenChange = mock(() => {});

		const { getByTestId } = render(
			wrap(
				<ConfirmDialog
					open={true}
					onOpenChange={onOpenChange}
					title="Delete record?"
					onConfirm={onConfirm}
				/>,
			),
		);

		await act(async () => {
			await user.click(getByTestId("confirm-dialog-cancel"));
		});

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(onConfirm).not.toHaveBeenCalled();
	});
});
