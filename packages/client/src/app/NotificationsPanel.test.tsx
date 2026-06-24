import { describe, expect, mock, spyOn, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { I18nProvider } from "../i18n/i18n";
import { NotificationsPanel } from "./NotificationsPanel";
import type { AdminNotification } from "./notificationsParse";

function note(over: Partial<AdminNotification> = {}): AdminNotification {
	return {
		id: "a",
		title: "Title",
		body: null,
		icon: null,
		color: null,
		actions: [],
		readAt: null,
		createdAt: "2026-06-24T10:00:00Z",
		...over,
	};
}

interface PanelProps {
	items?: AdminNotification[];
	loading?: boolean;
	error?: boolean;
	onMarkRead?: (id: string) => void;
	onDelete?: (id: string) => void;
	onClearAll?: () => void;
}

function renderPanel(props: PanelProps = {}) {
	return render(
		<I18nProvider defaultLang="en" languages={{ en: async () => ({}) }}>
			<NotificationsPanel
				items={props.items ?? []}
				loading={props.loading ?? false}
				error={props.error ?? false}
				onMarkRead={props.onMarkRead ?? (() => {})}
				onDelete={props.onDelete ?? (() => {})}
				onClearAll={props.onClearAll ?? (() => {})}
			/>
		</I18nProvider>,
	);
}

describe("NotificationsPanel", () => {
	test("shows a spinner while loading with no items yet", () => {
		const { getByTestId } = renderPanel({ loading: true });
		expect(getByTestId("notifications-loading")).toBeTruthy();
	});

	test("shows the empty state when there are no notifications", () => {
		const { getByTestId } = renderPanel({});
		expect(getByTestId("notifications-empty")).toBeTruthy();
	});

	test("renders notification titles in a list", () => {
		const { getByText } = renderPanel({ items: [note({ title: "Booking confirmed" })] });
		expect(getByText("Booking confirmed")).toBeTruthy();
	});

	test("disables clear-all when the list is empty", () => {
		const { getByTestId } = renderPanel({});
		expect(getByTestId("notifications-clear-all").hasAttribute("disabled")).toBe(true);
	});

	test("enables clear-all when there are notifications", () => {
		const { getByTestId } = renderPanel({ items: [note()] });
		expect(getByTestId("notifications-clear-all").hasAttribute("disabled")).toBe(false);
	});

	test("clicking clear-all invokes the handler", () => {
		const onClearAll = mock(() => {});
		const { getByTestId } = renderPanel({ items: [note()], onClearAll });
		fireEvent.click(getByTestId("notifications-clear-all"));
		expect(onClearAll).toHaveBeenCalled();
	});

	test("clicking an unread row marks it read", () => {
		const onMarkRead = mock(() => {});
		const { getByTestId } = renderPanel({ items: [note()], onMarkRead });
		const row = getByTestId("notification-item").querySelector("button");
		fireEvent.click(row as Element);
		expect(onMarkRead).toHaveBeenCalledWith("a");
	});

	test("clicking the delete button removes the notification", () => {
		const onDelete = mock(() => {});
		const { getByTestId } = renderPanel({ items: [note()], onDelete });
		fireEvent.click(getByTestId("notification-delete"));
		expect(onDelete).toHaveBeenCalledWith("a");
	});

	test("clicking an action marks it read and opens the link", () => {
		const onMarkRead = mock(() => {});
		const openSpy = spyOn(window, "open").mockImplementation(() => null);
		const { getByTestId } = renderPanel({
			items: [note({ actions: [{ label: "Go", url: "/x", newTab: true }] })],
			onMarkRead,
		});
		fireEvent.click(getByTestId("notification-action"));
		expect(onMarkRead).toHaveBeenCalledWith("a");
		expect(openSpy).toHaveBeenCalledWith("/x", "_blank", "noopener,noreferrer");
		openSpy.mockRestore();
	});
});
