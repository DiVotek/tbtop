import type { ClientActionContext, StructureNode } from "../structure/types";

type Bag = Record<string, unknown>;
type Handler = (ctx: ClientActionContext) => Promise<void>;

export interface ConfirmSpec {
	title: string;
	description?: string;
}

/** A server action with `confirm` renders as a modal with confirm/cancel. */
export function confirmModal(base: Bag, confirm: ConfirmSpec, handler: Handler): Bag {
	const confirmedHandler: Handler = async (ctx) => {
		await handler(ctx);
		ctx.modal?.close();
	};
	return {
		title: confirm.title,
		description: confirm.description,
		body: confirmBody(base, confirmedHandler),
	};
}

function confirmBody(base: Bag, confirmedHandler: Handler): StructureNode {
	return {
		kind: "row",
		options: {
			children: [
				{
					kind: "action",
					name: "confirm",
					options: {
						name: "confirm",
						label: (base.label as string | undefined) ?? "Confirm",
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
