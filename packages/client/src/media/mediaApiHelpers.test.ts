/**
 * Normalizer tests: the PHP MediaResource serialises ids as integers while
 * the client contract declares them as strings — every API payload shape
 * must come out with string ids.
 */
import { describe, expect, test } from "bun:test";
import {
	normalizeMediaFolder,
	normalizeMediaItem,
	normalizeMediaListResponse,
} from "./mediaApiHelpers";

const RAW_ITEM = {
	id: 7,
	name: "photo.jpg",
	folderId: 3,
	mime: "image/jpeg",
	size: 1024,
	url: "/storage/photo.jpg",
	sizes: {},
	alt: null,
	description: null,
	tags: [],
	createdAt: "2024-01-15T10:00:00Z",
};

describe("media id normalization", () => {
	test("normalizeMediaItem coerces id and folderId to strings", () => {
		const item = normalizeMediaItem(RAW_ITEM);
		expect(item.id).toBe("7");
		expect(item.folderId).toBe("3");
		expect(normalizeMediaItem({ ...RAW_ITEM, folderId: null }).folderId).toBeNull();
	});

	test("normalizeMediaFolder coerces id and parentId to strings", () => {
		const folder = normalizeMediaFolder({ id: 5, name: "Docs", parentId: 2 });
		expect(folder.id).toBe("5");
		expect(folder.parentId).toBe("2");
		expect(normalizeMediaFolder({ id: 5, name: "Docs", parentId: null }).parentId).toBeNull();
	});

	test("normalizeMediaListResponse normalizes items and child folders", () => {
		const res = normalizeMediaListResponse({
			data: [RAW_ITEM],
			folders: [{ id: 5, name: "Docs", parentId: null }],
			total: 1,
			page: 1,
			perPage: 24,
		});
		expect(res.data[0]?.id).toBe("7");
		expect(res.folders?.[0]?.id).toBe("5");
	});

	test("normalizeMediaListResponse passes malformed payloads through", () => {
		const malformed = [] as unknown;
		expect(normalizeMediaListResponse(malformed)).toBe(malformed as never);
	});
});
