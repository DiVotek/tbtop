/**
 * FolderTree dialog tests.
 *
 * Verifies that create/rename/delete use proper dialogs (no window.prompt /
 * window.confirm) and that a 409 response surfaces as an error message.
 *
 * Contract mocked:
 *   POST   /media/folders       → 201 MediaFolder
 *   PATCH  /media/folders/:id   → 200 MediaFolder
 *   DELETE /media/folders/:id   → 204 | 409 { message }
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { ClientProvider, createAdminClient } from "../data/client";
import { clearBlockRegistry } from "../render/blockRegistry";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import type { FetchHandler } from "../testFixtures";
import { makeTestFetch } from "../testFixtures";
import { FolderTree } from "./folderTree";
import type { MediaFolder } from "./types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FOLDER_A: MediaFolder = { id: "f1", name: "Photos", parentId: null };

function wrap(handler: FetchHandler) {
	const client = createAdminClient({ baseUrl: "http://test", fetch: makeTestFetch(handler) });
	return function Wrapper({ children }: { children: ReactNode }) {
		return <ClientProvider client={client}>{children}</ClientProvider>;
	};
}

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

afterEach(() => {
	clearBlockRegistry();
});

// ─── Markup validity ──────────────────────────────────────────────────────────

describe("FolderTree: row markup", () => {
	// Regression: folder rows were <button> wrapping the menu-trigger
	// <button> — invalid HTML, hydration warning in React 19.
	test("rows do not nest the menu trigger inside another button", async () => {
		const user = userEvent.setup({ delay: null });
		const selected: (string | null)[] = [];
		const Wrap = wrap(async () => new Response("[]"));

		const { container, getByTestId } = render(
			<Wrap>
				<FolderTree
					folders={[FOLDER_A]}
					selectedId={null}
					onSelect={(id) => selected.push(id)}
					onMutated={() => {}}
				/>
			</Wrap>,
		);

		expect(container.querySelector("button button")).toBeNull();

		// Row still selects the folder on click.
		await act(async () => {
			await user.click(getByTestId("folder-item-f1"));
		});
		expect(selected.at(-1)).toBe("f1");
	});
});

// ─── Create via dialog ────────────────────────────────────────────────────────

describe("FolderTree: create folder dialog", () => {
	test("opening create menu item shows FolderNameDialog, confirming calls POST", async () => {
		const user = userEvent.setup({ delay: null });
		const posts: unknown[] = [];
		const handler: FetchHandler = async (req) => {
			if (req.method === "POST" && req.url.includes("/media/folders")) {
				const body = await req.json();
				posts.push(body);
				return new Response(
					JSON.stringify({
						id: "f99",
						name: (body as Record<string, string>).name,
						parentId: null,
					}),
					{ status: 201, headers: { "Content-Type": "application/json" } },
				);
			}
			return new Response("[]");
		};
		const Wrap = wrap(handler);
		const mutated: number[] = [];

		const { getByTestId, findByTestId, queryByTestId } = render(
			<Wrap>
				<FolderTree
					folders={[]}
					selectedId={null}
					onSelect={() => {}}
					onMutated={() => mutated.push(1)}
				/>
			</Wrap>,
		);

		// Open the context menu on "All files"
		const trigger = getByTestId("folder-menu-trigger");
		await act(async () => {
			await user.click(trigger);
		});
		// Click "New subfolder"
		const createItem = await findByTestId("folder-menu-create");
		await act(async () => {
			await user.click(createItem);
		});
		// Dialog should appear
		await findByTestId("folder-name-dialog");

		// Type a name and confirm
		const input = getByTestId("folder-name-input");
		await act(async () => {
			await user.clear(input);
			await user.type(input, "My New Folder");
		});
		await act(async () => {
			await user.click(getByTestId("folder-name-confirm"));
		});

		await waitFor(() => expect(posts).toHaveLength(1));
		expect((posts[0] as Record<string, string>).name).toBe("My New Folder");
		await waitFor(() => expect(mutated).toHaveLength(1));

		// Dialog should close
		expect(queryByTestId("folder-name-dialog")).toBeNull();
	});
});

// ─── Rename via dialog ────────────────────────────────────────────────────────

describe("FolderTree: rename folder dialog", () => {
	test("rename menu item shows dialog pre-filled, confirming calls PATCH", async () => {
		const user = userEvent.setup({ delay: null });
		const patches: unknown[] = [];
		const handler: FetchHandler = async (req) => {
			if (req.method === "PATCH" && req.url.includes("/media/folders/f1")) {
				const body = await req.json();
				patches.push(body);
				return new Response(
					JSON.stringify({
						id: "f1",
						name: (body as Record<string, string>).name,
						parentId: null,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			}
			return new Response("[]");
		};
		const Wrap = wrap(handler);
		const mutated: number[] = [];

		const { getByTestId, findByTestId, queryByTestId } = render(
			<Wrap>
				<FolderTree
					folders={[FOLDER_A]}
					selectedId={null}
					onSelect={() => {}}
					onMutated={() => mutated.push(1)}
				/>
			</Wrap>,
		);

		// Open context menu on FOLDER_A
		const triggers = getByTestId(`folder-item-f1`).querySelectorAll(
			"[data-testid='folder-menu-trigger']",
		);
		const trigger = triggers[0] as HTMLElement;
		await act(async () => {
			await user.click(trigger);
		});
		const renameItem = await findByTestId("folder-menu-rename");
		await act(async () => {
			await user.click(renameItem);
		});

		// Dialog appears pre-filled with "Photos"
		const dialog = await findByTestId("folder-name-dialog");
		expect(dialog).toBeTruthy();
		const input = getByTestId("folder-name-input") as HTMLInputElement;
		expect(input.value).toBe("Photos");

		// Change the name
		await act(async () => {
			await user.clear(input);
			await user.type(input, "Renamed");
		});
		await act(async () => {
			await user.click(getByTestId("folder-name-confirm"));
		});

		await waitFor(() => expect(patches).toHaveLength(1));
		expect((patches[0] as Record<string, string>).name).toBe("Renamed");
		await waitFor(() => expect(mutated).toHaveLength(1));
		expect(queryByTestId("folder-name-dialog")).toBeNull();
	});
});

// ─── Delete via dialog ────────────────────────────────────────────────────────

describe("FolderTree: delete folder dialog", () => {
	test("delete menu item shows confirm dialog, confirming calls DELETE", async () => {
		const user = userEvent.setup({ delay: null });
		let deleteCalled = false;
		const handler: FetchHandler = (req) => {
			if (req.method === "DELETE" && req.url.includes("/media/folders/f1")) {
				deleteCalled = true;
				return new Response(null, { status: 204 });
			}
			return new Response("[]");
		};
		const Wrap = wrap(handler);
		const mutated: number[] = [];

		const { getByTestId, findByTestId, queryByTestId } = render(
			<Wrap>
				<FolderTree
					folders={[FOLDER_A]}
					selectedId={null}
					onSelect={() => {}}
					onMutated={() => mutated.push(1)}
				/>
			</Wrap>,
		);

		const triggers = getByTestId(`folder-item-f1`).querySelectorAll(
			"[data-testid='folder-menu-trigger']",
		);
		await act(async () => {
			await user.click(triggers[0] as HTMLElement);
		});
		const deleteItem = await findByTestId("folder-menu-delete");
		await act(async () => {
			await user.click(deleteItem);
		});

		// Delete confirmation dialog
		await findByTestId("folder-delete-dialog");

		// Confirm delete
		await act(async () => {
			await user.click(getByTestId("confirm-dialog-confirm"));
		});

		await waitFor(() => expect(deleteCalled).toBe(true));
		await waitFor(() => expect(mutated).toHaveLength(1));
		expect(queryByTestId("folder-delete-dialog")).toBeNull();
	});

	test("DELETE 409 response shows error message in tree", async () => {
		const user = userEvent.setup({ delay: null });
		const handler: FetchHandler = (req) => {
			if (req.method === "DELETE" && req.url.includes("/media/folders/f1")) {
				return new Response(JSON.stringify({ message: "Folder is not empty" }), {
					status: 409,
					headers: { "Content-Type": "application/json" },
				});
			}
			return new Response("[]");
		};
		const Wrap = wrap(handler);

		const { getByTestId, findByTestId, findByRole } = render(
			<Wrap>
				<FolderTree
					folders={[FOLDER_A]}
					selectedId={null}
					onSelect={() => {}}
					onMutated={() => {}}
				/>
			</Wrap>,
		);

		const triggers = getByTestId(`folder-item-f1`).querySelectorAll(
			"[data-testid='folder-menu-trigger']",
		);
		await act(async () => {
			await user.click(triggers[0] as HTMLElement);
		});
		const deleteItem = await findByTestId("folder-menu-delete");
		await act(async () => {
			await user.click(deleteItem);
		});
		await findByTestId("folder-delete-dialog");
		await act(async () => {
			await user.click(getByTestId("confirm-dialog-confirm"));
		});

		// Error message should be visible in the tree
		const alert = await findByRole("alert");
		expect(alert.textContent?.length).toBeGreaterThan(0);
	});
});
