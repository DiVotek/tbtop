import { unwrapData } from "../data/envelope";
import type { ClientActionContext, StructureNode } from "../structure/types";

type Bag = Record<string, unknown>;

/** Reserved action name the server resolves to a richtext embed (EmbedApply::ACTION). */
const EMBED_ACTION = "__embed";

/**
 * Binds each declared embed's "Apply" to the page's action endpoint. The embed's
 * own fields are walked by materialize() like any other nested field list.
 */
export function materializeRichtext(node: StructureNode, basePath: string): StructureNode {
	const options = node.options as Bag;
	if (!Array.isArray(options.embeds) || options.embeds.length === 0) {
		return node;
	}
	const field = node.name ?? "";
	const embeds = (options.embeds as Bag[]).map((embed) => ({
		...embed,
		apply: (ctx: ClientActionContext, form: Bag) =>
			ctx.client
				.post(`${basePath}/actions/${EMBED_ACTION}`, {
					payload: { embed: { field, kind: embed.kind }, form, params: ctx.params },
				})
				.then((body) => unwrapData(body) as Bag),
	}));
	return { ...node, options: { ...options, embeds } };
}
