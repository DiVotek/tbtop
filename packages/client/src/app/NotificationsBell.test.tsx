import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { ClientProvider } from "../data/client";
import { I18nProvider } from "../i18n/i18n";
import { type FetchHandler, makeTestClient } from "../testFixtures";
import { NotificationsBell } from "./NotificationsBell";

function wrap(unreadCount: number) {
	const handler: FetchHandler = () =>
		new Response(JSON.stringify({ data: [], unreadCount }), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	const client = makeTestClient(handler);
	return ({ children }: { children: ReactNode }) => (
		<I18nProvider defaultLang="en" languages={{ en: async () => ({}) }}>
			<ClientProvider client={client}>{children}</ClientProvider>
		</I18nProvider>
	);
}

describe("NotificationsBell", () => {
	test("shows the unread badge from the mount fetch", async () => {
		const { getByTestId } = render(<NotificationsBell />, { wrapper: wrap(3) });
		await waitFor(() => expect(getByTestId("notifications-badge").textContent).toBe("3"));
	});

	test("caps the badge at 99+", async () => {
		const { getByTestId } = render(<NotificationsBell />, { wrapper: wrap(150) });
		await waitFor(() => expect(getByTestId("notifications-badge").textContent).toBe("99+"));
	});

	test("hides the badge when nothing is unread", async () => {
		const { getByTestId, queryByTestId } = render(<NotificationsBell />, { wrapper: wrap(0) });
		await waitFor(() => expect(getByTestId("notifications-trigger")).toBeTruthy());
		expect(queryByTestId("notifications-badge")).toBeNull();
	});
});
