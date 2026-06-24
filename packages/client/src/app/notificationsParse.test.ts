import { describe, expect, test } from "bun:test";
import { parseNotificationList } from "./notificationsParse";

describe("parseNotificationList", () => {
	test("parses items and the unread count", () => {
		const result = parseNotificationList({
			data: [{ id: "a", title: "Hello", readAt: null, createdAt: "2026-06-24T10:00:00Z" }],
			unreadCount: 3,
		});
		expect(result).not.toBeNull();
		expect(result?.unreadCount).toBe(3);
		expect(result?.items).toHaveLength(1);
		expect(result?.items[0]?.title).toBe("Hello");
	});

	test("returns null when the envelope is not an object", () => {
		expect(parseNotificationList(null)).toBeNull();
		expect(parseNotificationList("nope")).toBeNull();
	});

	test("defaults missing fields and a missing data array", () => {
		const result = parseNotificationList({ unreadCount: "bad" });
		expect(result?.items).toEqual([]);
		expect(result?.unreadCount).toBe(0);
	});

	test("drops items without a string id and defaults optional fields", () => {
		const result = parseNotificationList({
			data: [{ title: "no id" }, { id: "ok", createdAt: "2026-06-24T10:00:00Z" }],
			unreadCount: 0,
		});
		expect(result?.items).toHaveLength(1);
		const item = result?.items[0];
		expect(item?.id).toBe("ok");
		expect(item?.title).toBe("");
		expect(item?.body).toBeNull();
		expect(item?.actions).toEqual([]);
	});

	test("keeps only well-formed actions and the newTab flag when true", () => {
		const result = parseNotificationList({
			data: [
				{
					id: "a",
					createdAt: "2026-06-24T10:00:00Z",
					actions: ["bad", { label: "No url" }, { label: "Go", url: "/x", newTab: true }],
				},
			],
			unreadCount: 0,
		});
		expect(result?.items[0]?.actions).toEqual([{ label: "Go", url: "/x", newTab: true }]);
	});
});
