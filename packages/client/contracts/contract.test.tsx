import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import kitchenSink from "../../contracts/fixtures/kitchen-sink.json";
import { PageParamsProvider } from "../src/app/pageParams";
import { ClientProvider } from "../src/data/client";
import { materialize } from "../src/inertia/materialize";
import { ensureBuiltinsRegistered } from "../src/render/registerBuiltins";
import { renderNode } from "../src/render/structureRenderer";
import type { StructureNode } from "../src/structure/types";
import { actionSpecSchema, structureNodeSchema } from "./grammar";

const fixture = kitchenSink as StructureNode;

describe("wire grammar contract (client side)", () => {
	it("the PHP-emitted kitchen-sink fixture passes the zod grammar", () => {
		expect(() => structureNodeSchema.parse(fixture)).not.toThrow();
	});

	// zod strips unknown keys silently, so a stale grammar would drop newTab
	// without failing the fixture parse above — the action would quietly
	// regress to same-tab navigation with every gate still green.
	it("a visit spec keeps newTab through the grammar", () => {
		const parsed = actionSpecSchema.parse({
			type: "visit",
			href: "/admin/posts/preview",
			newTab: true,
		});

		expect(parsed).toEqual({ type: "visit", href: "/admin/posts/preview", newTab: true });
	});

	it("the fixture materializes and renders without crashing", async () => {
		ensureBuiltinsRegistered();
		const node = materialize(fixture, { basePath: "/admin/kitchen-sink", data: {} });
		const { container, findByTestId } = render(
			<ClientProvider baseUrl="">
				<PageParamsProvider params={{}}>{renderNode(node)}</PageParamsProvider>
			</ClientProvider>,
		);
		// form data resolves async (props-fed promise) — wait for the body
		expect(await findByTestId("form-block")).not.toBeNull();
		expect(container.textContent).toContain("Kitchen sink");
	});
});
