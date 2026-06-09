import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import kitchenSink from "../../contracts/fixtures/kitchen-sink.json";
import { PageParamsProvider } from "../src/app/pageParams";
import { ClientProvider } from "../src/data/client";
import { materialize } from "../src/inertia/materialize";
import { ensureBuiltinsRegistered } from "../src/render/registerBuiltins";
import { renderNode } from "../src/render/structureRenderer";
import type { StructureNode } from "../src/structure/types";
import { structureNodeSchema } from "./grammar";

const fixture = kitchenSink as StructureNode;

describe("wire grammar contract (client side)", () => {
	it("the PHP-emitted kitchen-sink fixture passes the zod grammar", () => {
		expect(() => structureNodeSchema.parse(fixture)).not.toThrow();
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
