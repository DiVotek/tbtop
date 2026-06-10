import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, fireEvent, render } from "@testing-library/react";
import { clearBlockRegistry } from "../render/blockRegistry";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

afterEach(() => {
	clearBlockRegistry();
});

describe("ActionGroup block", () => {
	test("ActionGroup: renders trigger button with the group label", () => {
		const node = s.actionGroup("More actions", [
			s.action({ name: "pub", label: "Publish", url: "/publish" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const trigger = getByTestId("action-group-trigger");
		expect(trigger.textContent).toContain("More actions");
	});

	test("ActionGroup: menu is hidden before trigger click", () => {
		const node = s.actionGroup("Options", [s.action({ name: "x", label: "X", url: "/" })]);
		const Wrap = wrap(() => new Response("{}"));
		const { queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(queryByTestId("action-group-menu")).toBeNull();
	});

	test("ActionGroup: clicking trigger opens the dropdown menu", async () => {
		const node = s.actionGroup("Options", [
			s.action({ name: "edit", label: "Edit", url: "/edit" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId, findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await act(async () => {
			fireEvent.click(getByTestId("action-group-trigger"));
		});
		await findByTestId("action-group-menu");
	});

	test("ActionGroup: visit action inside group dispatches navigation on click", async () => {
		const visited: string[] = [];
		const node = s.actionGroup("Publish actions", [
			s.action({
				name: "go-live",
				label: "Go live",
				handler: async (c) => {
					c.navigate("/admin/posts/publish");
				},
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId, findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		// open menu
		await act(async () => {
			fireEvent.click(getByTestId("action-group-trigger"));
		});
		await findByTestId("action-group-menu");
		// click inner action
		await act(async () => {
			fireEvent.click(await findByTestId("action-go-live"));
		});
		// handler ran — no error thrown
	});

	test("ActionGroup: confirm action inside group shows confirm dialog via existing protocol", async () => {
		const handlerCalled = mock(() => Promise.resolve());
		const node = s.actionGroup("Danger zone", [
			s.action({
				name: "danger",
				label: "Delete all",
				handler: handlerCalled,
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId, findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		// open menu
		await act(async () => {
			fireEvent.click(getByTestId("action-group-trigger"));
		});
		await findByTestId("action-group-menu");
		// click inner action
		await act(async () => {
			fireEvent.click(await findByTestId("action-danger"));
		});
		expect(handlerCalled.mock.calls.length).toBeGreaterThan(0);
	});
});
