/**
 * Tests for visit-template interpolation: {field} placeholders in href are
 * resolved from the nearest row context.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { materialize } from "../inertia/materialize";
import { clearBlockRegistry } from "../render/blockRegistry";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { RowProvider } from "./rowContext";
import { type StructureNode, s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

afterEach(() => {
	clearBlockRegistry();
});

describe("Visit-template interpolation", () => {
	test("static visit renders a link with the exact href", async () => {
		const node = s.action({ name: "home", label: "Home", url: "/admin/posts" });
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const el = await findByTestId("action-home");
		expect(el.tagName.toLowerCase()).toBe("a");
		expect(el.getAttribute("href")).toBe("/admin/posts");
	});

	test("template visit with row context interpolates {id}", async () => {
		const node = s.action({ name: "edit", label: "Edit", url: "/admin/posts/{id}/edit" });
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(
			<Wrap>
				<RowProvider value={{ id: "42", title: "Hello" }}>{renderNode(node)}</RowProvider>
			</Wrap>,
		);
		const el = await findByTestId("action-edit");
		expect(el.getAttribute("href")).toBe("/admin/posts/42/edit");
	});

	test("template visit percent-encodes reserved characters in row values", async () => {
		const node = s.action({ name: "edit", label: "Edit", url: "/admin/posts/{id}/edit" });
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(
			<Wrap>
				<RowProvider value={{ id: "a/b?x=1&y=2#part name" }}>
					{renderNode(node)}
				</RowProvider>
			</Wrap>,
		);
		const el = await findByTestId("action-edit");
		expect(el.getAttribute("href")).toBe(
			"/admin/posts/a%2Fb%3Fx%3D1%26y%3D2%23part%20name/edit",
		);
	});

	test("template visit with multiple placeholders interpolates all", async () => {
		const node = s.action({
			name: "view",
			label: "View",
			url: "/admin/{type}/{id}/show",
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(
			<Wrap>
				<RowProvider value={{ id: "7", type: "post" }}>{renderNode(node)}</RowProvider>
			</Wrap>,
		);
		const el = await findByTestId("action-view");
		expect(el.getAttribute("href")).toBe("/admin/post/7/show");
	});

	test("template visit outside row context: action hidden + console.warn in dev", async () => {
		const node = s.action({ name: "edit", label: "Edit", url: "/admin/posts/{id}/edit" });
		const Wrap = wrap(() => new Response("{}"));
		const warns: unknown[] = [];
		const origWarn = console.warn;
		console.warn = (...args: unknown[]) => warns.push(args);
		const { queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		console.warn = origWarn;
		expect(queryByTestId("action-edit")).toBeNull();
		expect(warns.length).toBeGreaterThan(0);
	});

	// A serialized {row.*} template keeps its placeholder when the value is missing.
	// The hidden-action outcome is the security property: an empty substitution would
	// have produced a live link to /admin/posts//delete.
	test("serialized {row.*} template with a missing value: action hidden, no malformed href", async () => {
		const serialized = {
			kind: "action",
			name: "delete",
			meta: {},
			options: {
				label: "Delete",
				spec: { type: "visit", href: "/admin/posts/{row.id}/delete" },
			},
		} as unknown as StructureNode;
		const node = materialize(serialized, { basePath: "/admin/posts", data: {} });
		const Wrap = wrap(() => new Response("{}"));
		const warns: unknown[] = [];
		const origWarn = console.warn;
		console.warn = (...args: unknown[]) => warns.push(args);
		const { queryByTestId } = render(
			<Wrap>
				<RowProvider value={{ title: "row without an id" }}>{renderNode(node)}</RowProvider>
			</Wrap>,
		);
		console.warn = origWarn;
		expect(queryByTestId("action-delete")).toBeNull();
		expect(warns.length).toBeGreaterThan(0);
	});

	test("template visit with missing row key: action hidden + console.warn in dev", async () => {
		const node = s.action({ name: "edit", label: "Edit", url: "/admin/posts/{slug}/edit" });
		const Wrap = wrap(() => new Response("{}"));
		const warns: unknown[] = [];
		const origWarn = console.warn;
		console.warn = (...args: unknown[]) => warns.push(args);
		const { queryByTestId } = render(
			<Wrap>
				<RowProvider value={{ id: "1", title: "No slug here" }}>
					{renderNode(node)}
				</RowProvider>
			</Wrap>,
		);
		console.warn = origWarn;
		expect(queryByTestId("action-edit")).toBeNull();
		expect(warns.length).toBeGreaterThan(0);
	});
});
