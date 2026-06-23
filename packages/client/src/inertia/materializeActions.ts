import type { FormDataConvertible } from "@inertiajs/core";
import { router } from "@inertiajs/react";
import { unwrapData } from "../data/envelope";
import type { ClientActionContext, StructureNode } from "../structure/types";
import { getCustomAction } from "./customActions";
import { executeEffects, readEffects } from "./effects";
import { serializeFormData } from "./serializeFormData";

type Bag = Record<string, unknown>;
type Handler = (ctx: ClientActionContext) => Promise<void>;

interface ActionMaterializeCtx {
	basePath: string;
	formName?: string;
	formNode?: StructureNode;
	materializeNode: (node: StructureNode) => StructureNode;
}

interface ActionSpec {
	type: "visit" | "submit" | "server" | "modal" | "custom";
	href?: string;
	form?: string;
	needs?: string[];
	title?: string;
	description?: string;
	body?: StructureNode;
	handler?: string;
	params?: Bag;
	/** Modal backend data query: fetch on open, feed the body. */
	query?: boolean;
	queryNeeds?: string[];
}

/**
 * Turns a serialized action node's options (`spec` + presentation)
 * into the options bag the ported ActionBlock understands
 * (`handler` / `url` / `modal` functions).
 */
export function materializeActionOptions(node: StructureNode, ctx: ActionMaterializeCtx): Bag {
	const { spec, confirm, ...rest } = node.options as Bag & {
		spec?: ActionSpec;
		confirm?: { title: string; description?: string };
	};
	const base: Bag = { name: node.name, ...rest };
	if (!spec) {
		return base;
	}
	if (spec.type === "visit") {
		// Row-aware templating: '/admin/posts/{row.id}/edit' resolves
		// against the nearest table row at render time.
		const href = spec.href ?? "";
		if (href.includes("{row.")) {
			return {
				...base,
				url: (actionCtx: ClientActionContext) => fillRowTemplate(href, actionCtx),
			};
		}
		return { ...base, url: href };
	}
	if (spec.type === "modal") {
		return { ...base, modal: materializeModal(node.name ?? "", spec, ctx) };
	}
	const handler = buildHandler(node, spec, ctx);
	if (confirm) {
		return { ...base, modal: confirmModal(base, confirm, handler) };
	}
	if (spec.type === "submit") {
		return { ...base, handler, isSubmit: true };
	}
	return { ...base, handler };
}

function fillRowTemplate(template: string, ctx: ClientActionContext): string {
	return template.replaceAll(/\{row\.([a-zA-Z0-9_]+)\}/g, (_, key: string) =>
		String(ctx.row?.[key] ?? ""),
	);
}

function buildHandler(node: StructureNode, spec: ActionSpec, ctx: ActionMaterializeCtx): Handler {
	if (spec.type === "submit") {
		return submitHandler(ctx.basePath, spec.form ?? ctx.formName ?? "", ctx.formNode);
	}
	if (spec.type === "custom") {
		return async (actionCtx) => {
			await getCustomAction(spec.handler ?? "")?.(actionCtx, spec.params ?? {});
		};
	}
	return serverHandler({
		basePath: ctx.basePath,
		name: node.name ?? "",
		needs: spec.needs ?? [],
		formNode: ctx.formNode,
	});
}

function submitHandler(
	basePath: string,
	formName: string,
	formNode: StructureNode | undefined,
): Handler {
	return (ctx) =>
		new Promise<void>((resolve, reject) => {
			const data = serializeFormData(ctx.form?.data ?? {}, formNode) as Record<
				string,
				FormDataConvertible
			>;
			router.post(`${basePath}/forms/${formName}`, data, {
				preserveScroll: true,
				preserveState: true,
				onSuccess: () => resolve(),
				onError: (errors) => reject({ errors: liftNestedErrors(errors) }),
			});
		});
}

/**
 * Laravel keys nested errors as 'sections.0.heading'; field components
 * look up by root name. Lift the first nested message onto the root key
 * so repeater/array validation failures stay visible.
 */
function liftNestedErrors(errors: Record<string, string>): Record<string, string> {
	const lifted: Record<string, string> = { ...errors };
	for (const [key, message] of Object.entries(errors)) {
		const root = key.split(".")[0] ?? key;
		if (root !== key && lifted[root] === undefined) {
			lifted[root] = message;
		}
	}
	return lifted;
}

/** Shape the row/selection/form payload an action endpoint expects. */
function actionPayload(ctx: ClientActionContext, needs: string[], formNode?: StructureNode): Bag {
	const payload: Bag = {};
	if (needs.includes("form")) {
		payload.form = serializeFormData(ctx.form?.data ?? {}, formNode);
	}
	if (needs.includes("row")) {
		payload.row = ctx.row ?? {};
	}
	if (needs.includes("selection")) {
		payload.selection = ctx.table?.selectedIds ?? [];
	}
	payload.params = ctx.params;
	return payload;
}

interface ServerHandlerInput {
	basePath: string;
	name: string;
	needs: string[];
	formNode?: StructureNode;
}

function serverHandler({ basePath, name, needs, formNode }: ServerHandlerInput): Handler {
	return async (ctx) => {
		const payload = actionPayload(ctx, needs, formNode);
		const body = (await ctx.client.post(`${basePath}/actions/${name}`, { payload })) as {
			effects?: unknown;
		};
		executeEffects(readEffects(body?.effects), ctx);
	};
}

function modalDataQuery(
	basePath: string,
	name: string,
	needs: string[],
): (ctx: ClientActionContext) => Promise<unknown> {
	return (ctx) =>
		ctx.client
			.post(`${basePath}/actions/${name}/data`, { payload: actionPayload(ctx, needs) })
			.then(unwrapData);
}

function materializeModal(name: string, spec: ActionSpec, ctx: ActionMaterializeCtx): Bag {
	const modal: Bag = {
		title: spec.title ?? "",
		description: spec.description,
		body: spec.body ? ctx.materializeNode(spec.body) : undefined,
	};
	if (spec.query) {
		modal.query = modalDataQuery(ctx.basePath, name, spec.queryNeeds ?? ["row"]);
	}
	return modal;
}

/** A server action with `confirm` renders as a modal with confirm/cancel. */
function confirmModal(
	base: Bag,
	confirm: { title: string; description?: string },
	handler: Handler,
): Bag {
	const confirmedHandler: Handler = async (ctx) => {
		await handler(ctx);
		ctx.modal?.close();
	};
	return {
		title: confirm.title,
		description: confirm.description,
		body: {
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
						},
						meta: {},
					},
				],
			},
			meta: {},
		},
	};
}
