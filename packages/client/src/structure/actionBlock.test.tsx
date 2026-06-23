import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, fireEvent, render } from "@testing-library/react";
import { toast } from "sonner";
import { renderNode } from "../render/structureRenderer";
import { isExternalUrl } from "./actionBlock";
import { type StructureNode, s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";

describe("Action error reporting outside a form", () => {
	const originalError = console.error;
	const originalToastError = toast.error;
	let toastErrorSpy: ReturnType<typeof mock>;
	beforeEach(() => {
		console.error = mock(() => {});
		toastErrorSpy = mock(() => "id");
		(toast as unknown as { error: typeof toastErrorSpy }).error = toastErrorSpy;
	});
	afterEach(() => {
		console.error = originalError;
		(toast as unknown as { error: typeof originalToastError }).error = originalToastError;
	});

	test("Action handler error in standalone action logs to console.error and notifies", async () => {
		const node = s.stack([
			s.action({
				name: "boom",
				handler: async () => {
					throw new Error("kaboom");
				},
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const btn = await findByTestId("action-boom");
		await act(async () => {
			fireEvent.click(btn);
		});
		const errMock = console.error as unknown as { mock: { calls: unknown[][] } };
		expect(errMock.mock.calls.length).toBeGreaterThan(0);
		expect(toastErrorSpy.mock.calls[0]?.[0]).toBe("kaboom");
	});

	test("Action handler error in table rowAction surfaces via notify, not silently swallowed", async () => {
		const node = s.table({
			query: async () => [{ id: "a", title: "A" }],
			columns: [{ name: "title" }],
			rowActions: [
				{
					name: "explode",
					handler: async () => {
						throw new Error("row boom");
					},
				},
			],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const btn = await findByTestId("action-explode");
		await act(async () => {
			fireEvent.click(btn);
		});
		expect(toastErrorSpy.mock.calls[0]?.[0]).toBe("row boom");
	});
});

describe("Action testid fallback", () => {
	test("Action node without name falls back to label, not 'undefined'", async () => {
		const node: StructureNode = {
			kind: "action",
			options: { label: "Save", handler: async () => {} },
			meta: {},
		};
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("action-Save");
		expect(queryByTestId("action-undefined")).toBeNull();
	});
});

describe("Action with modal", () => {
	test("Action modal trigger opens dialog with title and description", async () => {
		const node = s.action({
			name: "delete",
			label: "Delete",
			modal: {
				title: "Delete post?",
				description: "Cannot be undone.",
				body: (sb) => sb.row([sb.action({ name: "cancel", url: "/" })]),
			},
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, findByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		const trigger = await findByTestId("action-delete");
		await act(async () => {
			fireEvent.click(trigger);
		});
		await findByText("Delete post?");
		await findByText("Cannot be undone.");
	});

	test("Action inside modal receives c.modal.close that closes the modal", async () => {
		const node = s.action({
			name: "delete",
			label: "Delete",
			modal: {
				title: "Delete post?",
				body: (sb) =>
					sb.row([
						sb.action({
							name: "confirm",
							label: "Confirm",
							handler: async (c) => {
								c.modal?.close();
							},
						}),
					]),
			},
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		const trigger = await findByTestId("action-delete");
		await act(async () => {
			fireEvent.click(trigger);
		});
		const confirm = await findByTestId("action-confirm");
		await act(async () => {
			fireEvent.click(confirm);
		});
		expect(queryByText("Delete post?")).toBeNull();
	});

	test("Action c.modal.closeAll closes nested modal stack", async () => {
		const node = s.action({
			name: "outer",
			label: "Outer",
			modal: {
				title: "Outer modal",
				body: (sb) =>
					sb.row([
						sb.action({
							name: "inner",
							label: "Open inner",
							modal: {
								title: "Inner modal",
								body: (sb2) =>
									sb2.row([
										sb2.action({
											name: "close-all",
											label: "Close all",
											handler: async (c) => {
												c.modal?.closeAll();
											},
										}),
									]),
							},
						}),
					]),
			},
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		await act(async () => {
			fireEvent.click(await findByTestId("action-outer"));
		});
		await act(async () => {
			fireEvent.click(await findByTestId("action-inner"));
		});
		await act(async () => {
			fireEvent.click(await findByTestId("action-close-all"));
		});
		expect(queryByText("Outer modal")).toBeNull();
		expect(queryByText("Inner modal")).toBeNull();
	});

	test("Modal action with size passes it to ModalShell", async () => {
		const node = s.action({
			name: "open",
			label: "Open",
			modal: {
				title: "Large modal",
				size: "lg",
			},
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, baseElement } = render(<Wrap>{renderNode(node)}</Wrap>);
		const trigger = await findByTestId("action-open");
		await act(async () => {
			fireEvent.click(trigger);
		});
		// ModalShell with size="lg" applies sm:max-w-2xl on the dialog content
		const dialog = baseElement.querySelector('[role="dialog"]');
		expect(dialog?.className ?? "").toContain("sm:max-w-2xl");
	});
});

describe("Action trigger variants", () => {
	test("gray color maps to the secondary button variant", () => {
		const node = s.action({
			name: "restore",
			label: "Restore",
			color: "gray",
			handler: async () => {},
		});
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(getByTestId("action-restore").getAttribute("data-variant")).toBe("secondary");
	});

	test("size sets the button data-size", () => {
		const node = s.action({ name: "go", label: "Go", size: "sm", handler: async () => {} });
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(getByTestId("action-go").getAttribute("data-size")).toBe("sm");
	});

	test("outlined danger uses the outline variant with a destructive tint", () => {
		const node = s.action({
			name: "del",
			label: "Delete",
			color: "danger",
			outlined: true,
			handler: async () => {},
		});
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const btn = getByTestId("action-del");
		expect(btn.getAttribute("data-variant")).toBe("outline");
		expect(btn.className).toContain("border-destructive");
	});

	test("as:link renders the link button variant", () => {
		const node = s.action({ name: "more", label: "More", as: "link", handler: async () => {} });
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(getByTestId("action-more").getAttribute("data-variant")).toBe("link");
	});

	test("isExternalUrl flags off-origin and non-http links, not relative routes", () => {
		expect(isExternalUrl("https://example.com/x")).toBe(true);
		expect(isExternalUrl("mailto:a@b.com")).toBe(true);
		expect(isExternalUrl("/admin/posts")).toBe(false);
		expect(isExternalUrl(`${window.location.origin}/admin/x`)).toBe(false);
	});
});
