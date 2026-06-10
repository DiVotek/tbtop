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
import { ConfirmDialog } from "./modal-shell";

function wrap(ui: React.ReactNode) {
	return <I18nProvider defaultLang="en">{ui}</I18nProvider>;
}

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
