import { expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { clientWrapper } from "../testFixtures";
import { useNotifications } from "./useNotifications";

test.each([
	"empty",
	"malformed",
	"failed",
])("discards a stale %s refresh after a mutation", async (response) => {
	const stale = Promise.withResolvers<Response>();
	let reads = 0;
	const { result } = renderHook(() => useNotifications(null), {
		wrapper: clientWrapper((req) => {
			if (req.method !== "GET") {
				return new Response(null, { status: 204 });
			}
			if (++reads > 1) {
				return stale.promise;
			}
			return Response.json({ data: [], unreadCount: 0 });
		}),
	});
	await waitFor(() => expect(result.current.loading).toBe(false));
	const refresh = result.current.refresh();
	await waitFor(() => expect(reads).toBe(2));
	await act(() => result.current.remove("missing"));
	await act(async () => {
		if (response === "failed") {
			stale.reject(new Error("offline"));
		} else {
			stale.resolve(Response.json(response === "empty" ? { data: [], unreadCount: 0 } : {}));
		}
		await refresh;
	});
	expect(result.current.items).toEqual([]);
	expect(result.current.unreadCount).toBe(0);
	expect(result.current.error).toBe(false);
});

test("a refresh requested during a mutation waits for persistence", async () => {
	const mutation = Promise.withResolvers<Response>();
	let reads = 0;
	const { result } = renderHook(() => useNotifications(null), {
		wrapper: clientWrapper((req) => {
			if (req.method !== "GET") {
				return mutation.promise;
			}
			reads += 1;
			return Response.json({ data: [], unreadCount: 0 });
		}),
	});
	await waitFor(() => expect(result.current.loading).toBe(false));
	const removal = result.current.remove("missing");
	const refresh = result.current.refresh();
	await act(async () => {
		await Promise.resolve();
	});
	expect(reads).toBe(1);
	await act(async () => {
		mutation.resolve(new Response(null, { status: 204 }));
		await removal;
		await refresh;
	});
	expect(reads).toBe(2);
	expect(result.current.error).toBe(false);
});
