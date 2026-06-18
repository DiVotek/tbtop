/**
 * useUploadQueue — a second upload call while the first batch is still in flight
 * must APPEND its rows, not replace the list (which would wipe live progress).
 */
import { describe, expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { ClientProvider } from "../data/client";
import { type FetchHandler, makeTestClient } from "../testFixtures";
import type { MediaItem } from "./types";
import { useUploadQueue } from "./useUploadQueue";

const UPLOADED: MediaItem = {
	id: "u1",
	name: "x.png",
	folderId: null,
	mime: "image/png",
	size: 1,
	url: "/storage/x.png",
	sizes: {},
	alt: null,
	description: null,
	tags: [],
	createdAt: "2024-02-01T10:00:00Z",
};

/** A handler whose response can be released on demand, to freeze a batch mid-flight. */
function deferredHandler(): { handler: FetchHandler; release: () => void } {
	let release = () => {};
	const gate = new Promise<void>((r) => {
		release = r;
	});
	const handler: FetchHandler = async () => {
		await gate;
		return new Response(JSON.stringify(UPLOADED), { status: 201 });
	};
	return { handler, release };
}

function wrap(handler: FetchHandler) {
	const client = makeTestClient(handler);
	return ({ children }: { children: ReactNode }) => (
		<ClientProvider client={client}>{children}</ClientProvider>
	);
}

function fileNamed(name: string): File {
	return new File(["x"], name, { type: "image/png" });
}

describe("useUploadQueue", () => {
	test("a second upload call appends rather than replacing the task list", async () => {
		const { handler, release } = deferredHandler();
		const { result } = renderHook(
			() => useUploadQueue({ folderId: null, onUploaded: () => {} }),
			{
				wrapper: wrap(handler),
			},
		);

		// Batch 1 starts and hangs (handler gate not released).
		act(() => {
			void result.current.uploadFiles([fileNamed("first.png")]);
		});
		await waitFor(() => expect(result.current.tasks).toHaveLength(1));

		// Batch 2 arrives mid-flight — must not wipe batch 1's row.
		act(() => {
			void result.current.uploadFiles([fileNamed("second.png")]);
		});
		expect(result.current.tasks).toHaveLength(2);
		expect(result.current.tasks.map((t) => t.name)).toEqual(["first.png", "second.png"]);

		release();
		await waitFor(() =>
			expect(result.current.tasks.every((t) => t.status === "done")).toBe(true),
		);
	});
});
