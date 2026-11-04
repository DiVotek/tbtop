import { expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020";
import kitchenSinkJson from "../../contracts/fixtures/kitchen-sink.json";
import schema from "../../contracts/structure.schema.json";
import { materialize, runWithContext } from "../src/dsl";
import { kitchenSink } from "./fixtures/kitchenSink.fixture";

const validateNode = new Ajv2020({ strict: false }).compile(schema);

async function serialize(): Promise<unknown> {
	return runWithContext({}, () => materialize(kitchenSink()));
}

test("the kitchen-sink page validates against structure.schema.json", async () => {
	const tree = await serialize();
	expect(validateNode(tree)).toBe(true);
});

test("the TS kitchen-sink serializes byte-equal (key order included) to the PHP snapshot", async () => {
	const tree = await serialize();
	expect(JSON.stringify(tree, null, 4)).toBe(JSON.stringify(kitchenSinkJson, null, 4));
});
