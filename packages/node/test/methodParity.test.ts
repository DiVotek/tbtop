import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import * as dsl from "../src/dsl";

const API_DIR = `${import.meta.dir}/../../../docs/ai/api`;

/** PHP short class name → TS export, where the names differ. */
const RENAMED: Record<string, string> = {
	Boolean: "BooleanField",
	Date: "DateField",
	Number: "NumberField",
	LiveRegionBuilder: "LiveRegion",
};

/** PHP-only methods with no TS twin, each with the reason. */
const SKIPPED: Record<string, string> = {
	"Stat::openInNewTab": "deprecated in PHP; a new port carries no back-compat shims",
	"ActionBuilder::visit": "deprecated in PHP; use url() plus openUrlInNewTab()",
	"TableBuilder::perPage": "deprecated in PHP; use paginate()",
	"TableBuilder::softDeletes": "a free function in TS: softDeletes(table, s, { driver })",
};

type Ctor = { prototype: object };

/** Reads every `Class` section of a generated reference page into class → methods. */
function documentedMethods(page: string): Map<string, string[]> {
	const sections = new Map<string, string[]>();
	let current: string[] = [];
	for (const line of readFileSync(`${API_DIR}/${page}.md`, "utf8").split("\n")) {
		const cls = /^`Tbtop\\[\w\\]+\\(\w+)`$/.exec(line);
		if (cls?.[1]) {
			current = [];
			sections.set(cls[1], current);
		}
		const method = /^\| `(?:static )?(\w+)\(/.exec(line);
		if (method?.[1]) {
			current.push(method[1]);
		}
	}
	return sections;
}

function exportFor(phpClass: string): Ctor {
	const name = RENAMED[phpClass] ?? phpClass;
	const ctor = (dsl as unknown as Record<string, Ctor | undefined>)[name];
	if (ctor === undefined) {
		throw new Error(`No TS export for PHP class ${phpClass} (looked for ${name}).`);
	}
	return ctor;
}

for (const page of ["fields", "blocks", "builder", "tables", "actions"]) {
	for (const [phpClass, methods] of documentedMethods(page)) {
		test(`${page}: ${phpClass} has every documented PHP method`, () => {
			const ctor = exportFor(phpClass);
			const missing = methods.filter(
				(m) =>
					!(m in ctor.prototype) &&
					!(m in ctor) &&
					SKIPPED[`${phpClass}::${m}`] === undefined,
			);
			expect(missing).toEqual([]);
		});
	}
}
