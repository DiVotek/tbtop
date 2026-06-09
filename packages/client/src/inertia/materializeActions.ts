import type { FormDataConvertible } from "@inertiajs/core";
import { router } from "@inertiajs/react";
import type { ClientActionContext, StructureNode } from "../structure/types";
import { getCustomAction } from "./customActions";
import { executeEffects, readEffects } from "./effects";

type Bag = Record<string, unknown>;
type Handler = (ctx: ClientActionContext) => Promise<void>;

export interface ActionMaterializeCtx {
	basePath: string;
	formName?: string;
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
		return { ...base, modal: materializeModal(spec, ctx) };
	}
	const handler = buildHandler(node, spec, ctx);
	if (confirm) {
		return { ...base, modal: confirmModal(base, confirm, handler) };
	}
	return { ...base, handler };
}

function fillRowTemplate(template: string, ctx: ClientActionContext): string {
	return template.replace(/\{row\.([a-zA-Z0-9_]+)\}/g, (_, key: string) =>
		String(ctx.row?.[key] ?? ""),
	);
}

function buildHandler(node: StructureNode, spec: ActionSpec, ctx: ActionMaterializeCtx): Handler {
	if (spec.type === "submit") {
		return submitHandler(ctx.basePath, spec.form ?? ctx.formName ?? "");
	}
	if (spec.type === "custom") {
		return async (actionCtx) => {
			await getCustomAction(spec.handler ?? "")?.(actionCtx, spec.params ?? {});
		};
	}
	return serverHandler(ctx.basePath, node.name ?? "", spec.needs ?? []);
}

function submitHandler(basePath: string, formName: string): Handler {
	return (ctx) =>
		new Promise<void>((resolve, reject) => {
			const data = (ctx.form?.data ?? {}) as Record<string, FormDataConvertible>;
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

function serverHandler(basePath: string, name: string, needs: string[]): Handler {
	return async (ctx) => {
		const payload: Bag = {};
		if (needs.includes("form")) {
			payload.form = ctx.form?.data ?? {};
		}
		if (needs.includes("row")) {
			payload.row = ctx.row ?? {};
		}
		if (needs.includes("selection")) {
			payload.selection = ctx.table?.selectedIds ?? [];
		}
		payload.params = ctx.params;
		const body = (await ctx.client.post(`${basePath}/actions/${name}`, { payload })) as {
			effects?: unknown;
		};
		executeEffects(readEffects(body?.effects), ctx);
	};
}

function materializeModal(spec: ActionSpec, ctx: ActionMaterializeCtx): Bag {
	return {
		title: spec.title ?? "",
		description: spec.description,
		body: spec.body ? ctx.materializeNode(spec.body) : undefined,
	};
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
