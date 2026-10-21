import { collectAll } from "../walk";
import { Select } from "./choices";
import { Field } from "./field";
import { Upload } from "./files";
import { Relation } from "./nested";
import { Richtext } from "./richtext";
import { Daterange } from "./temporal";

const RESOLVED_BY_NAME = [Relation, Select, Upload, Daterange] as const;

/**
 * An embed field sharing class and name with another field would answer a
 * field endpoint with the wrong closure, so the form refuses to build
 * (EmbedFieldCollisions.php).
 */
export function assertNoEmbedCollisions(children: unknown[]): void {
	const formFields = fieldsUnder(children);
	const owners = new Map<string, string>();
	for (const field of formFields) {
		const key = lookupKey(field);
		if (key !== null) {
			owners.set(key, "the form");
		}
	}
	for (const field of formFields) {
		if (field instanceof Richtext) {
			claimEmbedFields(field, owners);
		}
	}
}

function claimEmbedFields(richtext: Richtext, owners: Map<string, string>): void {
	for (const embed of richtext.getEmbeds()) {
		const keyed = fieldsUnder(embed.includedFields()).flatMap((inner) => {
			const key = lookupKey(inner);
			return key === null ? [] : [{ inner, key }];
		});
		const clash = keyed.find(({ key }) => owners.has(key));
		if (clash !== undefined) {
			throw new Error(
				`Field "${clash.inner.name}" in embed "${embed.kind}" of richtext "${richtext.name}" shares its name with a field of ${owners.get(clash.key)}; the field endpoints resolve by name, so rename one.`,
			);
		}
		for (const { key } of keyed) {
			owners.set(key, `embed "${embed.kind}"`);
		}
	}
}

function fieldsUnder(children: unknown[]): Field[] {
	return collectAll(children, (c) => c instanceof Field) as Field[];
}

function lookupKey(field: Field): string | null {
	const type = RESOLVED_BY_NAME.find((cls) => field instanceof cls);
	return type === undefined ? null : `${type.name}:${field.name}`;
}
