import { trans } from "../../i18n";
import type { ActionBuilder } from "../action";
import type { ActionCtx, HandlerResult } from "../actionCtx";
import { Effects } from "../effects";
import type { FormBuilder } from "../form";
import { Node } from "../node";
import type { S } from "../s";

export type RecordFn = (ctx: ActionCtx) => HandlerResult | Promise<HandlerResult>;

/** A void/null return falls back to the tail; returning Effects replaces it. */
function wrap(userFn: RecordFn, tail: () => Effects) {
	return async (ctx: ActionCtx) => {
		const result = await userFn(ctx);
		return result instanceof Effects ? result : tail();
	};
}

const doneTail = () => Effects.make().notify(trans("action.done")).refreshTable();

/** Record-scoped server actions with a default notify/refresh tail (RecordAction.php). */
export const RecordAction = {
	/** A single-row action (needs: row). */
	server(s: S, name: string, fns: { using: RecordFn; tail?: () => Effects }): ActionBuilder {
		return s.action(name).handle(wrap(fns.using, fns.tail ?? doneTail), ["row"]);
	},

	/** A bulk action (needs: selection); an empty selection notifies and skips the closure. */
	bulk(s: S, name: string, fns: { using: RecordFn; tail?: () => Effects }): ActionBuilder {
		const wrapped = wrap(fns.using, fns.tail ?? doneTail);
		return s.action(name).handle(
			async (ctx) => {
				if (ctx.selection.length === 0) {
					return Effects.make().notify(trans("table.nothing_selected"), "warning");
				}
				return wrapped(ctx);
			},
			["selection"],
		);
	},

	/** The form node with the inner actions appended as an actionsRow. */
	formWithActions(form: FormBuilder, s: S, actions: ActionBuilder[]): Node {
		const node = form.toNode();
		const children = [...((node.options.children as unknown[]) ?? []), s.actionsRow(actions)];
		return new Node("form", { ...node.options, children }, node.name, node.meta);
	},
};

/** A server round-trip that only closes the modal. */
export function closeButton(s: S, name: string, label: string): ActionBuilder {
	return s
		.action(name)
		.label(label)
		.handle(() => Effects.make().closeModal());
}
