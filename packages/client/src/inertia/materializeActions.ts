import type { FormDataConvertible } from "@inertiajs/core";
import { router } from "@inertiajs/react";
import { unwrapData } from "../data/envelope";
import type { Translate } from "../i18n/i18n";
import type { ClientActionContext, StructureNode } from "../structure/types";
import type { ModalSize } from "../ui/modal-shell";
import { type ConfirmSpec, confirmModal } from "./confirmModal";
import { getCustomAction } from "./customActions";
import { executeEffects, readEffects } from "./effects";
import { liftNestedErrors } from "./fieldErrors";
import { serializeFormData } from "./serializeFormData";

type Bag = Record<string, unknown>;
type Handler = (ctx: ClientActionContext) => Promise<void>;

interface ActionMaterializeCtx {
	basePath: string;
	formName?: string;
	formNode?: StructureNode;
	materializeNode: (node: StructureNode) => StructureNode;
	t?: Translate;
}

interface ActionSpec {
	type: "visit" | "submit" | "server" | "modal" | "custom";
	href?: string;
	newTab?: boolean;
	form?: string;
	needs?: string[];
	/** Written only when the action opted out of the form's validation gate. */
	validate?: false;
	title?: string;
	description?: string;
	body?: StructureNode;
	handler?: string;
	params?: Bag;
	/** Modal backend data query: fetch on open, feed the body. */
	query?: boolean;
	queryNeeds?: string[];
	size?: ModalSize;
	/** Render as a right-anchored, edge-flush slide-over panel. */
	slideOver?: boolean;
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
				newTab: spec.newTab,
				url: (actionCtx: ClientActionContext) => fillRowTemplate(href, actionCtx),
			};
		}
		return { ...base, newTab: spec.newTab, url: href };
	}
	if (spec.type === "modal") {
		return { ...base, modal: materializeModal(node.name ?? "", spec, ctx) };
	}
	return handlerBag({ base, node, spec, ctx, confirm });
}

interface HandlerBagInput {
	base: Bag;
	node: StructureNode;
	spec: ActionSpec;
	ctx: ActionMaterializeCtx;
	confirm?: ConfirmSpec;
}

/**
 * Handler-carrying branches (submit / server / custom). `consumesForm` marks
 * whether the handler reads the form AND is gated by it — submit, and server
 * actions with needs:['form'] that did not opt out via ->withoutValidation().
 * Everything else (Cancel/close, row-scoped actions) must not trip the
 * surrounding form's pre-flight validation.
 */
function handlerBag({ base, node, spec, ctx, confirm }: HandlerBagInput): Bag {
	const handler = buildHandler(node, spec, ctx);
	const consumesForm =
		spec.type === "submit" || ((spec.needs ?? []).includes("form") && spec.validate !== false);
	const bag = { ...base, consumesForm };
	if (confirm) {
		return { ...bag, modal: confirmModal({ base: bag, confirm, handler }, ctx.t) };
	}
	return spec.type === "submit" ? { ...bag, handler, isSubmit: true } : { ...bag, handler };
}

/**
 * Row values are consumer data (slugs, titles, ids from arbitrary tables), so
 * a value containing '/', '?', '#', or '&' must not be able to reshape the
 * template's own URL structure — encode it so it fills exactly one segment.
 */
function fillRowTemplate(template: string, ctx: ClientActionContext): string {
	return template.replaceAll(/\{row\.([a-zA-Z0-9_]+)\}/g, (_, key: string) =>
		encodeURIComponent(toWellFormedString(String(ctx.row?.[key] ?? ""))),
	);
}

/**
 * encodeURIComponent throws a URIError on a lone UTF-16 surrogate. Row values
 * come from arbitrary JSON payloads, where a lone surrogate is a valid string
 * (e.g. `"\uD800"`), so replace unpaired surrogates with U+FFFD before
 * encoding rather than letting a malformed value crash the render.
 */
function toWellFormedString(value: string): string {
	return value.replaceAll(
		/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
		"�",
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
				onSuccess: () => {
					// Mark the form clean before resolving: props are already updated
					// at this point, so initial reflects the freshly saved record and
					// reset() re-syncs to it. Flash effects (executed separately in
					// AdminPage, without a form in context) may include a redirect —
					// a plain GET router.visit — and the unsaved-changes guard would
					// otherwise see a still-dirty form and block it with a native
					// "leave site?"/confirm prompt right after a successful save. See
					// the same fix for serverHandler above.
					ctx.form?.reset();
					resolve();
				},
				onError: (errors) => reject({ errors: liftNestedErrors(errors) }),
			});
		});
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
		const effects = readEffects(body?.effects);
		// Mark the form clean before applying effects: a redirect effect is a
		// plain GET router.visit, and the unsaved-changes guard would otherwise
		// see a still-dirty form and block it with a native "leave site?"/confirm
		// prompt right after a successful save. Only when the action actually
		// consumed the form — a row/page action that never read form data must
		// not wipe the user's unsaved input. A haltModal effect means the action
		// rejected the submission (e.g. a caught ValidationException) and the
		// modal stays open — resetting here would erase what the user typed
		// right before showing them the error banner, so skip it in that case.
		// A setFormData effect is the action rewriting the still-open form, so
		// the post-save reset would immediately discard what it just wrote.
		const keepsForm = effects.some((e) => e.kind === "haltModal" || e.kind === "setFormData");
		if (needs.includes("form") && !keepsForm) {
			ctx.form?.reset();
		}
		executeEffects(effects, ctx);
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
	if (spec.size !== undefined) {
		modal.size = spec.size;
	}
	if (spec.slideOver !== undefined) {
		modal.slideOver = spec.slideOver;
	}
	if (spec.query) {
		modal.query = modalDataQuery(ctx.basePath, name, spec.queryNeeds ?? ["row"]);
	}
	return modal;
}
