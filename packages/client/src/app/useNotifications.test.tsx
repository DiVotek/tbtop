import { describe, expect, spyOn, test } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { ClientProvider } from "../data/client";
import { I18nProvider } from "../i18n/i18n";
import { type FetchHandler, makeTestClient } from "../testFixtures";
import type { AdminNotification } from "./notificationsParse";
import { useNotifications } from "./useNotifications";

function note(id: string, readAt: string | null = null): AdminNotification {
	return {
		id,
		title: id,
		body: null,
		icon: null,
		color: null,
		actions: [],
		readAt,
		createdAt: "2026-06-24T10:00:00Z",
	};
}

function jsonResponse(body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
}

interface Recorder {
	calls: { method: string; path: string }[];
}

function called(rec: Recorder, method: string, path: string): boolean {
	return rec.calls.some((c) => c.method === method && c.path === path);
}

function handler(items: AdminNotification[], rec: Recorder, fail = false): FetchHandler {
	return (req) => {
		const { pathname } = new URL(req.url);
		if (req.method === "GET") {
			return jsonResponse({
				data: items,
				unreadCount: items.filter((n) => n.readAt === null).length,
			});
		}
		rec.calls.push({ method: req.method, path: pathname });
		return fail ? new Response("nope", { status: 500 }) : new Response(null, { status: 204 });
	};
}

function wrap(h: FetchHandler) {
	const client = makeTestClient(h);
	return ({ children }: { children: ReactNode }) => (
		<I18nProvider defaultLang="en" languages={{ en: async () => ({}) }}>
			<ClientProvider client={client}>{children}</ClientProvider>
		</I18nProvider>
	);
}

function Harness() {
	const n = useNotifications(null);
	return (
		<div>
			<span data-testid="count">{n.unreadCount}</span>
			<span data-testid="size">{n.items.length}</span>
			{n.items.map((item) => (
				<span
					key={item.id}
					data-testid={`item-${item.id}`}
					data-read={item.readAt !== null}
				/>
			))}
			<button type="button" data-testid="mark-a" onClick={() => void n.markRead("a")} />
			<button type="button" data-testid="remove-a" onClick={() => void n.remove("a")} />
			<button type="button" data-testid="clear" onClick={() => void n.clearAll()} />
		</div>
	);
}

describe("useNotifications", () => {
	test("fetches on mount and exposes items with the unread count", async () => {
		const rec: Recorder = { calls: [] };
		const { getByTestId } = render(<Harness />, {
			wrapper: wrap(handler([note("a"), note("b", "2026-06-24T10:00:00Z")], rec)),
		});
		await waitFor(() => expect(getByTestId("count").textContent).toBe("1"));
		expect(getByTestId("size").textContent).toBe("2");
	});

	test("markRead marks read, decrements, and persists", async () => {
		const rec: Recorder = { calls: [] };
		const { getByTestId } = render(<Harness />, { wrapper: wrap(handler([note("a")], rec)) });
		await waitFor(() => expect(getByTestId("count").textContent).toBe("1"));
		fireEvent.click(getByTestId("mark-a"));
		await waitFor(() => expect(getByTestId("count").textContent).toBe("0"));
		expect(getByTestId("item-a").getAttribute("data-read")).toBe("true");
		await waitFor(() => expect(called(rec, "POST", "/notifications/a/read")).toBe(true));
	});

	test("markRead rolls back and toasts on failure", async () => {
		const errorSpy = spyOn(toast, "error").mockImplementation(() => "id");
		const rec: Recorder = { calls: [] };
		const { getByTestId } = render(<Harness />, {
			wrapper: wrap(handler([note("a")], rec, true)),
		});
		await waitFor(() => expect(getByTestId("count").textContent).toBe("1"));
		fireEvent.click(getByTestId("mark-a"));
		await waitFor(() => expect(errorSpy).toHaveBeenCalled());
		await waitFor(() => expect(getByTestId("count").textContent).toBe("1"));
		errorSpy.mockRestore();
	});

	test("remove deletes the item, decrements unread, and persists", async () => {
		const rec: Recorder = { calls: [] };
		const { getByTestId, queryByTestId } = render(<Harness />, {
			wrapper: wrap(handler([note("a"), note("b")], rec)),
		});
		await waitFor(() => expect(getByTestId("count").textContent).toBe("2"));
		fireEvent.click(getByTestId("remove-a"));
		await waitFor(() => expect(getByTestId("size").textContent).toBe("1"));
		expect(queryByTestId("item-a")).toBeNull();
		expect(getByTestId("count").textContent).toBe("1");
		await waitFor(() => expect(called(rec, "DELETE", "/notifications/a")).toBe(true));
	});

	test("remove rolls back on failure", async () => {
		const errorSpy = spyOn(toast, "error").mockImplementation(() => "id");
		const rec: Recorder = { calls: [] };
		const { getByTestId, queryByTestId } = render(<Harness />, {
			wrapper: wrap(handler([note("a")], rec, true)),
		});
		await waitFor(() => expect(getByTestId("size").textContent).toBe("1"));
		fireEvent.click(getByTestId("remove-a"));
		await waitFor(() => expect(errorSpy).toHaveBeenCalled());
		await waitFor(() => expect(queryByTestId("item-a")).not.toBeNull());
		errorSpy.mockRestore();
	});

	test("clearAll empties the list and persists", async () => {
		const rec: Recorder = { calls: [] };
		const { getByTestId } = render(<Harness />, {
			wrapper: wrap(handler([note("a"), note("b")], rec)),
		});
		await waitFor(() => expect(getByTestId("size").textContent).toBe("2"));
		fireEvent.click(getByTestId("clear"));
		await waitFor(() => expect(getByTestId("size").textContent).toBe("0"));
		expect(getByTestId("count").textContent).toBe("0");
		await waitFor(() => expect(called(rec, "DELETE", "/notifications")).toBe(true));
	});

	test("clearAll rolls back on failure", async () => {
		const errorSpy = spyOn(toast, "error").mockImplementation(() => "id");
		const rec: Recorder = { calls: [] };
		const { getByTestId } = render(<Harness />, {
			wrapper: wrap(handler([note("a"), note("b")], rec, true)),
		});
		await waitFor(() => expect(getByTestId("size").textContent).toBe("2"));
		fireEvent.click(getByTestId("clear"));
		await waitFor(() => expect(errorSpy).toHaveBeenCalled());
		await waitFor(() => expect(getByTestId("size").textContent).toBe("2"));
		errorSpy.mockRestore();
	});
});
