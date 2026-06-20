/**
 * Regression for M-95: a global `mock.module("@inertiajs/react", …)` must NOT
 * drop props on `Link`.
 *
 * Root cause (Bun mock pollution, NOT a network leak): `mock.module` is
 * process-global and persists across files. A stub `Link` that rendered only
 * `<a href>` (dropping `data-testid`, `asChild`, `ref`, `className`) leaked
 * out of CenterLayout.test.tsx / formUnsavedGuard.test.tsx into every later
 * file. `actionBlock` renders `<Button asChild data-testid=…><Link/></Button>`
 * and relies on `asChild` forwarding the testid onto the Link's `<a>`. The
 * prop-dropping stub silenced the testid, so `findByTestId('action-…')` timed
 * out — the 4 CI failures.
 *
 * This file reproduces the exact polluting pattern but with the FIX applied:
 * spread the real module so `Link` (and its prop forwarding) survives. The
 * assertion below FAILS if a stub Link drops props, PASSES once Link is real.
 *
 * Cross-file proof (these failed before the fix, pass after):
 *   bun test src/app/CenterLayout.test.tsx src/structure/visitTemplate.test.tsx
 *   bun test src/app/CenterLayout.test.tsx src/structure/actionGroupDropdown.test.tsx
 */
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as inertiaReact from "@inertiajs/react";
import { render } from "@testing-library/react";
import { clearBlockRegistry } from "../render/blockRegistry";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";

// A CenterLayout-style global mock. The FIX is the spread: the real Link is
// preserved, so asChild prop forwarding still reaches the rendered <a>.
mock.module("@inertiajs/react", () => ({
	...inertiaReact,
	usePage: () => ({ props: {}, url: "/admin/test", flash: {} }),
	router: { post: mock(() => {}), on: mock(() => () => {}) },
}));

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

afterEach(() => {
	clearBlockRegistry();
});

describe("M-95: global inertia mock keeps Link prop forwarding", () => {
	test("Link-backed action forwards data-testid onto the anchor", async () => {
		const node = s.action({ name: "view", label: "View", url: "/admin/posts" });
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		// asChild must forward the testid down to the real Link's <a>.
		const el = await findByTestId("action-view");
		expect(el.tagName.toLowerCase()).toBe("a");
		expect(el.getAttribute("href")).toBe("/admin/posts");
	});
});
