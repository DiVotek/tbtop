import { defaultMessages, type Translate } from "../i18n/i18n";
import type { ClientActionContext, StructureNode } from "../structure/types";

type Bag = Record<string, unknown>;
type Handler = (ctx: ClientActionContext) => Promise<void>;

export interface ConfirmSpec {
	title: string;
	description?: string;
}

/** A server action with `confirm` renders as a modal with confirm/cancel. */
export function confirmModal(
	base: Bag,
	confirm: ConfirmSpec,
	handler: Handler,
	t?: Translate,
): Bag {
	const confirmedHandler: Handler = async (ctx) => {
		await handler(ctx);
		ctx.modal?.close();
	};
	return {
		title: confirm.title,
		description: confirm.description,
		body: confirmBody(base, confirmedHandler, t),
	};
}

function confirmBody(base: Bag, confirmedHandler: Handler, t?: Translate): StructureNode {
	return {
		kind: "row",
		options: {
			children: [
				{
					kind: "action",
					name: "confirm",
					options: {
						name: "confirm",
						label:
							(base.label as string | undefined) ??
							t?.("action.confirm") ??
							defaultMessages["action.confirm"],
						color: base.color ?? "danger",
						handler: confirmedHandler,
						consumesForm: base.consumesForm,
					},
					meta: {},
				},
			],
		},
		meta: {},
	};
}
