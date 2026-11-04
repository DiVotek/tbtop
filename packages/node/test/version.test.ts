import { expect, test } from "bun:test";
import client from "../../client/package.json";
import node from "../package.json";

test("ships lockstep with @tbtop/inertia-admin", () => {
	expect(node.version).toBe(client.version);
});
