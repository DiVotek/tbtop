/**
 * Upload progress UI — uploading a file shows a per-file progress row with a
 * Progress bar, reports progress, and fires onUploaded on completion. Upload
 * goes through XHR, so we inject a mock XHR factory alongside the fetch mock.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { ClientProvider, createAdminClient } from "../data/client";
import { type FetchHandler, makeTestFetch } from "../testFixtures";
import { MediaGrid } from "./mediaGrid";
import type { MediaItem } from "./types";

type Listener = (e: unknown) => void;

class MockXhr {
	status = 0;
	responseText = "";
	withCredentials = false;
	private listeners: Record<string, Listener[]> = {};
	upload = {
		listeners: {} as Record<string, Listener[]>,
		addEventListener(type: string, fn: Listener) {
			(this.listeners[type] ??= []).push(fn);
		},
		emit(type: string, e: unknown) {
			for (const fn of this.listeners[type] ?? []) {
				fn(e);
			}
		},
	};
	open() {}
	setRequestHeader() {}
	addEventListener(type: string, fn: Listener) {
		(this.listeners[type] ??= []).push(fn);
	}
	emit(type: string, e: unknown = {}) {
		for (const fn of this.listeners[type] ?? []) {
			fn(e);
		}
	}
	abort() {}
	send() {
		// Drive the lifecycle on the next tick: progress then a 201 load.
		queueMicrotask(() => {
			this.upload.emit("progress", { lengthComputable: true, loaded: 50, total: 100 });
			this.status = 201;
			this.responseText = JSON.stringify(UPLOADED);
			this.emit("load");
		});
	}
}

const UPLOADED: MediaItem = {
	id: "new1",
	name: "fresh.png",
	folderId: null,
	mime: "image/png",
	size: 10,
	url: "/storage/fresh.png",
	sizes: {},
	alt: null,
	description: null,
	tags: [],
	createdAt: "2024-02-01T10:00:00Z",
};

function wrap(handler: FetchHandler, xhr: () => XMLHttpRequest) {
	const client = createAdminClient({
		baseUrl: "http://test",
		fetch: makeTestFetch(handler),
		xhr,
	});
	return function Wrapper({ children }: { children: ReactNode }) {
		return <ClientProvider client={client}>{children}</ClientProvider>;
	};
}

const LOADED = {
	kind: "loaded" as const,
	data: { data: [] as MediaItem[], total: 0, page: 1, perPage: 24 },
};
const params = { folder: null, search: "", page: 1, perPage: 24 };

beforeEach(() => {
	window.localStorage.removeItem("tbtop.media.view");
});

afterEach(() => {
	window.localStorage.removeItem("tbtop.media.view");
});

describe("MediaGrid: upload progress", () => {
	test("shows a progress row and fires onUploaded on completion", async () => {
		const user = userEvent.setup({ delay: null });
		const mock = new MockXhr();
		const uploaded: MediaItem[] = [];
		const Wrap = wrap(
			() => new Response("{}"),
			() => mock as unknown as XMLHttpRequest,
		);
		const { getByTestId, findByTestId } = render(
			<Wrap>
				<MediaGrid
					state={LOADED}
					params={params}
					onChangeParams={() => {}}
					onSelect={() => {}}
					onSelectFolder={() => {}}
					onUploaded={(i) => uploaded.push(i)}
					folderId={null}
					onOpenImportUrl={() => {}}
				/>
			</Wrap>,
		);
		const input = getByTestId("media-upload-input") as HTMLInputElement;
		const file = new File(["x"], "fresh.png", { type: "image/png" });
		await act(async () => {
			await user.upload(input, file);
		});
		const list = await findByTestId("media-upload-progress");
		expect(list.querySelector("[role='progressbar']")).toBeTruthy();
		await waitFor(() => expect(uploaded).toHaveLength(1));
		expect(uploaded[0]?.id).toBe("new1");
	});
});
