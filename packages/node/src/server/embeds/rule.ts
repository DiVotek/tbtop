import { collectAttributes, collectRules, currentContext, type Embed, Richtext } from "../../dsl";
import { fieldsByKey, type Rules } from "../../dsl/ruleWalker";
import { trans } from "../../i18n";
import type { SessionStore } from "../inertia/session";
import { bindUploads } from "../uploads/bind";
import { dataHas, dataSet, emptyToNull } from "../validation/data";
import { type HostRule, validate } from "../validation/validator";
import { embedNodes, isWellFormed, storedEmbedData } from "./documents";

type Bag = Record<string, unknown>;

/** The rule name bindEmbeds() appends: `tbtop_embeds:<field key>`. */
export const EMBEDS_RULE = "tbtop_embeds";

export interface EmbedEnv {
	session: SessionStore;
	records: unknown[];
	hostRules?: Record<string, HostRule>;
}

/** One embed's data against its own fields, uploads held to what `stored` already holds. */
export async function validateEmbed(embed: Embed, data: unknown, env: EmbedEnv) {
	const fields = embed.includedFields();
	const bound = await bindUploads(collectRules(fields), fields, env);
	return validate(emptyToNull(data), bound.rules, {
		attributes: collectAttributes(fields),
		hostRules: { ...env.hostRules, ...bound.hostRules },
	});
}

/**
 * EmbedsRule: every richtext with embeds checks its documents' embed nodes
 * (well-formed, at the root, unique ids, at most maxEmbeds, data valid for the
 * kind). `apply` then keeps only each embed's declared keys in the validated data.
 */
export function bindEmbeds(rules: Rules, children: unknown[], env: EmbedEnv) {
	const fields = richtextsWithEmbeds(children);
	const bound: Rules = { ...rules };
	for (const [key, field] of fields) {
		for (const valueKey of valueKeys(field, key)) {
			bound[valueKey] = [...(bound[valueKey] ?? []), `${EMBEDS_RULE}:${key}`];
		}
	}
	const cleaned = new Map<string, unknown>();
	const rule: HostRule = {
		message: "The :attribute field is invalid.",
		check: async (value, [key = ""], target) => {
			const field = fields.get(key);
			if (field === undefined) {
				return true;
			}
			const verdict = await checkDocument(field, value, env);
			if (typeof verdict === "string") {
				return verdict;
			}
			cleaned.set(target, verdict);
			return true;
		},
	};
	const apply = (validated: Bag): Bag => {
		for (const [key, document] of cleaned) {
			if (dataHas(validated, key)) {
				dataSet(validated, key, document);
			}
		}
		return validated;
	};
	const hostRules: Record<string, HostRule> = fields.size > 0 ? { [EMBEDS_RULE]: rule } : {};
	return { rules: bound, hostRules, apply };
}

function richtextsWithEmbeds(children: unknown[]): Map<string, Richtext> {
	const entries = Object.entries(fieldsByKey(children)).filter(
		(entry): entry is [string, Richtext] =>
			entry[1] instanceof Richtext && entry[1].getEmbeds().length > 0,
	);
	return new Map(entries);
}

function valueKeys(field: Richtext, key: string): string[] {
	return field.isTranslatableField()
		? currentContext().contentLocales.map((locale) => `${key}.${locale}`)
		: [key];
}

/** The document with each embed's data narrowed to its declared keys, or the first error. */
async function checkDocument(field: Richtext, document: unknown, env: EmbedEnv) {
	const found = embedNodes(document);
	const max = field.getMaxEmbeds();
	if (max !== null && found.length > max) {
		return trans("field.richtext.embed_errors.too_many", { max });
	}
	const stored = storedEmbedData(env.records, field.name);
	const ids = new Set<string>();
	for (const [index, [node, atRoot]] of found.entries()) {
		const n = index + 1;
		if (!atRoot || !isWellFormed(node)) {
			return trans("field.richtext.embed_errors.malformed", { n });
		}
		if (ids.has(node.id)) {
			return trans("field.richtext.embed_errors.duplicate_id", { n });
		}
		ids.add(node.id);
		const error = await checkNode(
			{ field, node, n },
			{ ...env, records: stored[node.kind] ?? [] },
		);
		if (error !== null) {
			return error;
		}
	}
	return document;
}

/** An unknown kind passes untouched; a known one has its data replaced by the validated data. */
async function checkNode(
	{ field, node, n }: { field: Richtext; node: Bag; n: number },
	env: EmbedEnv,
) {
	const embed = field.findEmbed(String(node.kind));
	if (embed === null) {
		return null;
	}
	const result = await validateEmbed(embed, node.data, env);
	if (!result.ok) {
		const message = Object.values(result.errors)[0]?.[0] ?? "";
		return trans("field.richtext.embed_errors.invalid", {
			label: embed.labelText(),
			n,
			message,
		});
	}
	node.data = result.validated;
	return null;
}
