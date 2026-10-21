import {
	ActionCtx,
	collectAttributes,
	collectRules,
	currentContext,
	Effects,
	type FormBuilder,
	materialize,
} from "../../dsl";
import { enclosingForm } from "../enclosingForm";
import { asJson, effectsBody, notFound, readBody } from "../http";
import { back, redirectOrLocation } from "../inertia/protocol";
import { bindUploads } from "../uploads/bind";
import { dataGet, dataHas, dataSet, emptyToNull, expandKey } from "../validation/data";
import { validate } from "../validation/validator";
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

/** The form's rules and labels; upload keys also check the path was issued (bindUploadPaths). */
async function formRules(form: FormBuilder, ctx: EndpointCtx) {
	const children = form.includedChildren();
	const bound = await bindUploads(collectRules(children), children, {
		session: ctx.session,
		records: [form.recordData()],
	});
	return {
		rules: bound.rules,
		attributes: collectAttributes(children),
		hostRules: { ...ctx.options.hostRules, ...bound.hostRules },
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
	const { rules, ...options } = await formRules(form, ctx);
	const outcome = await validate(emptyToNull(body), rules, options);
	if (!outcome.ok) {
		return { errors: outcome.errors };
	}
	const result = await handler(baseCtx(ctx, { form: outcome.validated }));
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
		const outcome = await submitFormOutcome(ctx, arg(ctx, 0), await readBody(ctx.request));
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
	const action = ctx.resolved.s.reachableAction(name);
	const handler = action?.handler();
	if (action === null || handler === undefined) {
		throw notFound(`Action "${name}" has no server handler on this page.`);
	}
	const base = baseCtx(ctx, payload);
	const form = await actionForm(ctx, name, {
		input: payload.form,
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
		return runActionWith(ctx, arg(ctx, 0), bag((await readBody(ctx.request)).payload));
	},
};

async function actionForm(
	ctx: EndpointCtx,
	name: string,
	{ input, gate }: { input: unknown; gate: boolean },
): Promise<Bag | null> {
	const form = enclosingForm(ctx.resolved, name);
	if (form === null) {
		return null;
	}
	const { rules, ...options } = await formRules(form, ctx);
	if (Object.keys(rules).length === 0) {
		return null;
	}
	if (!gate) {
		return declaredKeysOnly(emptyToNull(bag(input)), rules);
	}
	return validated(bag(input), rules, options);
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
		const query = ctx.resolved.s.reachableAction(arg(ctx, 0))?.queryClosure();
		if (query === undefined) {
			throw notFound(`Action "${arg(ctx, 0)}" has no data query on this page.`);
		}
		const payload = bag((await readBody(ctx.request)).payload);
		return { data: await query(baseCtx(ctx, payload)) };
	},
};

export const FORM_ENDPOINTS = [submitForm, runAction, actionData];
