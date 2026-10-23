import {
	ActionCtx,
	collectAttributes,
	collectRules,
	currentContext,
	Effects,
	type FormBuilder,
	materialize,
	modalData,
} from "../../dsl";
import { applyEmbed, EMBED_ACTION } from "../embeds/apply";
import { bindEmbeds } from "../embeds/rule";
import { enclosingForm, enclosingQueryAction } from "../enclosingForm";
import { asJson, effectsBody, notFound } from "../http";
import { back, redirectOrLocation } from "../inertia/protocol";
import { bindUploads } from "../uploads/bind";
import { dataGet, dataHas, dataSet, emptyToNull, expandKey } from "../validation/data";
import { validate } from "../validation/validator";
import { readInput } from "./input";
import { arg, type Endpoint, type EndpointCtx } from "./types";
import { validated } from "./validateWith";

type Bag = Record<string, unknown>;

const bag = (v: unknown): Bag =>
	v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Bag) : {};

function baseCtx(ctx: EndpointCtx, payload: Bag): ActionCtx {
	return new ActionCtx(ctx.request, {
		user: currentContext().user,
		form: bag(payload.form),
		row: bag(payload.row),
		selection: Array.isArray(payload.selection)
			? (payload.selection as (string | number)[])
			: [],
		params: { ...(bag(payload.params) as Record<string, string>), ...ctx.resolved.ctx.params },
	});
}

/**
 * The form's rules and labels (bindUploadPaths): upload keys also check the
 * path was issued or is stored on `records`, richtext embeds are validated
 * per kind, and `apply` narrows the validated embeds to their declared keys.
 */
async function formRules(form: FormBuilder, ctx: EndpointCtx, loaded: unknown[] = []) {
	const children = form.includedChildren();
	const env = { session: ctx.session, records: [form.recordData(), ...loaded] };
	const uploads = await bindUploads(collectRules(children), children, env);
	const embeds = bindEmbeds(uploads.rules, children, {
		...env,
		hostRules: ctx.options.hostRules,
		trimStrings: ctx.options.trimStrings,
	});
	return {
		rules: embeds.rules,
		attributes: collectAttributes(children),
		hostRules: { ...ctx.options.hostRules, ...uploads.hostRules, ...embeds.hostRules },
		apply: embeds.apply,
	};
}

/** What a form submit came to: validation errors, a URL to redirect to, or effects. */
export type FormOutcome =
	| { errors: Record<string, string[]> }
	| { redirect: string }
	| { effects: unknown };

/** FormSubmitController without the transport: validate, run onSubmit, report the outcome. */
export async function submitFormOutcome(
	ctx: EndpointCtx,
	name: string,
	body: Bag,
): Promise<FormOutcome> {
	const form = ctx.resolved.s.reachableForm(name);
	const handler = form?.submitHandler();
	if (form === null || handler === undefined) {
		throw notFound(`Form "${name}" is not submittable on this page.`);
	}
	const { rules, apply, ...options } = await formRules(form, ctx);
	const outcome = await validate(emptyToNull(body), rules, options);
	if (!outcome.ok) {
		return { errors: outcome.errors };
	}
	const result = await handler(baseCtx(ctx, { form: apply(outcome.validated) }));
	if (typeof result === "string") {
		return { redirect: result };
	}
	const { effects } = effectsBody(result, Effects.make());
	return { effects: asJson(await materialize(effects)) };
}

/**
 * POST forms/{name} (FormSubmitController): an Inertia visit. Errors and
 * effects travel through the session, then the client follows the redirect back.
 */
const submitForm: Endpoint = {
	method: "POST",
	pattern: ["forms", ":name"],
	async run(ctx) {
		const outcome = await submitFormOutcome(ctx, arg(ctx, 0), await readInput(ctx));
		if ("errors" in outcome) {
			return flashErrors(ctx, outcome.errors);
		}
		if ("redirect" in outcome) {
			return redirectOrLocation(ctx.request, outcome.redirect);
		}
		await ctx.session.set("flash", { "tbtop.effects": outcome.effects });
		return back(ctx.request, pageUrl(ctx));
	},
};

/** Laravel's Inertia middleware: the first message per key, under the visit's error bag. */
async function flashErrors(ctx: EndpointCtx, errors: Record<string, string[]>) {
	const first = Object.fromEntries(Object.entries(errors).map(([key, all]) => [key, all[0]]));
	const errorBag = ctx.request.headers.get("x-inertia-error-bag");
	await ctx.session.set("errors", errorBag ? { [errorBag]: first } : first);
	return back(ctx.request, pageUrl(ctx));
}

function pageUrl(ctx: EndpointCtx): string {
	return new URL(ctx.request.url).pathname.replace(/\/forms\/[^/]+\/?$/, "");
}

/** ActionController without the transport: `payload` is `{form?, row?, selection?, params?}`. */
export async function runActionWith(ctx: EndpointCtx, name: string, payload: Bag) {
	if (name === EMBED_ACTION) {
		return applyEmbed(ctx, payload);
	}
	const action = ctx.resolved.s.reachableAction(name);
	const handler = action?.handler();
	if (action === null || handler === undefined) {
		throw notFound(`Action "${name}" has no server handler on this page.`);
	}
	const base = baseCtx(ctx, payload);
	const form = await actionForm(ctx, name, {
		payload,
		gate: !action.skipsFormValidation(),
	});
	const result = await handler(form === null ? base : base.withForm(form));
	return typeof result === "string"
		? { effects: Effects.make().redirect(result) }
		: effectsBody(result, Effects.make());
}

/** POST actions/{name}: the enclosing form validates `payload.form` unless withoutValidation(). */
const runAction: Endpoint = {
	method: "POST",
	pattern: ["actions", ":name"],
	async run(ctx) {
		return runActionWith(ctx, arg(ctx, 0), bag((await readInput(ctx)).payload));
	},
};

async function actionForm(
	ctx: EndpointCtx,
	name: string,
	{ payload, gate }: { payload: Bag; gate: boolean },
): Promise<Bag | null> {
	const form = enclosingForm(ctx.resolved, name);
	if (form === null) {
		return null;
	}
	const loaded = gate ? await modalRecord(ctx, name, payload) : [];
	const { rules, apply, ...options } = await formRules(form, ctx, loaded);
	if (Object.keys(rules).length === 0) {
		return null;
	}
	if (!gate) {
		return declaredKeysOnly(emptyToNull(bag(payload.form)), rules);
	}
	return apply(await validated(bag(payload.form), rules, options));
}

/**
 * ActionController::modalRecord(): the record a modal form was loaded with,
 * its query() re-run for this submit's row/selection, so stored upload paths
 * pass. Empty without such a query or when a need it reads was not sent.
 */
async function modalRecord(ctx: EndpointCtx, name: string, payload: Bag): Promise<unknown[]> {
	const action = enclosingQueryAction(ctx.resolved, name);
	const query = action?.queryClosure();
	if (action === null || query === undefined) {
		return [];
	}
	const filled = (need: string) => {
		const value = payload[need];
		return value != null && value !== "" && !(Array.isArray(value) && value.length === 0);
	};
	if (!action.getQueryNeeds().every(filled)) {
		return [];
	}
	const data = await query(baseCtx(ctx, payload));
	return data !== null && typeof data === "object" ? [data] : [];
}

/** The keys the rules declare, values as-is: withoutValidation() keeps the shape, not the verdict. */
function declaredKeysOnly(input: unknown, rules: Record<string, string[]>): Bag {
	const keys = Object.keys(rules).flatMap((pattern) => expandKey(input, pattern));
	const containers = new Set(
		keys.flatMap((key) =>
			key
				.split(".")
				.slice(0, -1)
				.map((_, i, parts) => parts.slice(0, i + 1).join(".")),
		),
	);
	const picked: Bag = {};
	for (const key of keys.filter((k) => dataHas(input, k))) {
		if (!containers.has(key)) {
			dataSet(picked, key, dataGet(input, key));
		} else if (!dataHas(picked, key)) {
			dataSet(picked, key, []);
		}
	}
	return picked;
}

/** POST actions/{name}/data: a modal's query() with the row/selection context. */
const actionData: Endpoint = {
	method: "POST",
	pattern: ["actions", ":name", "data"],
	async run(ctx) {
		const action = ctx.resolved.s.reachableAction(arg(ctx, 0));
		const query = action?.queryClosure();
		if (action == null || query === undefined) {
			throw notFound(`Action "${arg(ctx, 0)}" has no data query on this page.`);
		}
		const payload = bag((await readInput(ctx)).payload);
		return { data: modalData(await query(baseCtx(ctx, payload)), action) };
	},
};

export const FORM_ENDPOINTS = [submitForm, runAction, actionData];
