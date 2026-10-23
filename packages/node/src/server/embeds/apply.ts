import { Effects } from "../../dsl";
import type { EndpointCtx } from "../endpoints/types";
import { invalid, notFound } from "../http";
import { validateEmbed } from "./rule";

/** Reserved action name; the field and kind travel in `payload.embed` (EmbedApply.php). */
export const EMBED_ACTION = "__embed";

type Bag = Record<string, unknown>;

const bag = (v: unknown): Bag =>
	v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Bag) : {};

/**
 * The embed modal's "Apply": validates `payload.form` against the embed's own
 * fields and answers the validated data. Embeds resolve through the page's
 * forms, not the action registry.
 */
export async function applyEmbed(ctx: EndpointCtx, payload: Bag) {
	const { field, kind } = bag(payload.embed);
	const embed =
		typeof field === "string" && typeof kind === "string"
			? ctx.resolved.s.findEmbed(field, kind)
			: null;
	if (embed === null) {
		throw notFound("No richtext on this page declares that embed.");
	}
	const result = await validateEmbed(embed, bag(payload.form), {
		session: ctx.session,
		records: [],
		hostRules: ctx.options.hostRules,
		trimStrings: ctx.options.trimStrings,
	});
	if (!result.ok) {
		throw invalid(result.errors);
	}
	return { effects: Effects.make(), data: result.validated };
}
