/**
 * Audit 5.21: a validation error on a field inside a non-active tab was
 * invisible — Save just showed a generic "fix the highlighted fields" toast
 * with no clue which tab to check. TabsBlock now shows a per-tab error-count
 * badge and auto-switches to the first errored tab when the active tab is
 * clean at submit time.
 */
import { describe, expect, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { renderNode } from "./structureRenderer";

ensureBuiltinsRegistered();

function throwingSaveAction(fields: Record<string, string>) {
	return s.action({
		name: "save",
		handler: async () => {
			const err = new Error("validation") as Error & { fields: Record<string, string> };
			err.fields = fields;
			throw err;
		},
	});
}

describe("TabsBlock error badges", () => {
	test("no badge on any tab when there are no field errors", async () => {
		const node = s.form({ query: async () => ({ name: "", email: "" }) }, [
			s.tabs([
				s.tab("General", s.stack([s.text({ name: "name" })])),
				s.tab("Contact", s.stack([s.text({ name: "email" })])),
			]),
		]);
		const { queryByTestId, findByTestId } = render(<Wrapper>{renderNode(node)}</Wrapper>);
		await findByTestId("form-block");
		expect(queryByTestId("tab-error-badge-General")).toBeNull();
		expect(queryByTestId("tab-error-badge-Contact")).toBeNull();
	});

	test("submitting with an error in the inactive tab shows a badge with the error count", async () => {
		const node = s.form({ query: async () => ({ name: "", email: "" }) }, [
			s.tabs([
				s.tab("General", s.stack([s.text({ name: "name" })])),
				s.tab("Contact", s.stack([s.text({ name: "email" })])),
			]),
			throwingSaveAction({ email: "Email is required" }),
		]);
		const { findByTestId } = render(<Wrapper>{renderNode(node)}</Wrapper>);
		const btn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(btn);
		});
		const badge = await findByTestId("tab-error-badge-Contact");
		expect(badge.textContent).toBe("1");
	});

	test("auto-switches to the first errored tab when the active tab is clean", async () => {
		const node = s.form({ query: async () => ({ name: "", email: "" }) }, [
			s.tabs([
				s.tab("General", s.stack([s.text({ name: "name" })])),
				s.tab("Contact", s.stack([s.text({ name: "email" })])),
			]),
			throwingSaveAction({ email: "Email is required" }),
		]);
		const { findByTestId, queryByTestId } = render(<Wrapper>{renderNode(node)}</Wrapper>);
		await findByTestId("form-block");
		// Active tab is "General" (index 0, default) — Contact's panel is hidden.
		expect(queryByTestId("tab-panel-Contact")?.getAttribute("data-state")).toBe("inactive");
		const btn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(btn);
		});
		await waitFor(() =>
			expect(queryByTestId("tab-panel-Contact")?.getAttribute("data-state")).toBe("active"),
		);
	});

	test("does not switch tabs when the active tab already has the error", async () => {
		const node = s.form({ query: async () => ({ name: "", email: "" }) }, [
			s.tabs([
				s.tab("General", s.stack([s.text({ name: "name" })])),
				s.tab("Contact", s.stack([s.text({ name: "email" })])),
			]),
			throwingSaveAction({ name: "Name is required" }),
		]);
		const { findByTestId, queryByTestId } = render(<Wrapper>{renderNode(node)}</Wrapper>);
		const btn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(btn);
		});
		await findByTestId("tab-error-badge-General");
		// Still on General (index 0) — no unnecessary switch away from the
		// tab that already shows the offending field.
		expect(queryByTestId("tab-panel-General")?.getAttribute("data-state")).toBe("active");
	});

	test("a repeater/dotted error path attributes to the tab that declares the repeater field", async () => {
		const node = s.form({ query: async () => ({ items: [] }) }, [
			s.tabs([
				s.tab("Main", s.stack([s.text({ name: "name" })])),
				s.tab(
					"Items",
					s.stack([
						s.repeater({
							name: "items",
							fields: (sb) => [sb.text({ name: "label" })],
						}),
					]),
				),
			]),
			throwingSaveAction({ "items.0.label": "Label is required" }),
		]);
		const { findByTestId } = render(<Wrapper>{renderNode(node)}</Wrapper>);
		const btn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(btn);
		});
		const badge = await findByTestId("tab-error-badge-Items");
		expect(badge.textContent).toBe("1");
	});

	test("TabsBlock outside any form renders with no badges and no crash", () => {
		const node = s.tabs([
			s.tab("A", { kind: "displayText", options: { content: "a" }, meta: {} }),
			s.tab("B", { kind: "displayText", options: { content: "b" }, meta: {} }),
		]);
		const { queryByTestId } = render(renderNode(node));
		expect(queryByTestId("tabs")).not.toBeNull();
		expect(queryByTestId("tab-error-badge-A")).toBeNull();
	});
});

function Wrapper({ children }: { children: React.ReactNode }) {
	const Wrap = wrap(() => new Response("{}"));
	return <Wrap>{children}</Wrap>;
}
