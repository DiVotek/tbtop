/**
 * ConfirmDialog behavioral tests.
 *
 * Red-green contract:
 *   - onConfirm fires when the confirm button is clicked
 *   - dialog closes (onOpenChange(false)) when cancel is clicked
 *
 * ModalShell itself has no behavior beyond what revola provides; layout/style
 * is not tested here — that's verified by the migrated media tests.
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
