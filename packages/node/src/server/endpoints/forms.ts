import {
	ActionCtx,
	collectAttributes,
	collectRules,
	currentContext,
	Effects,
	type FormBuilder,
} from "../../dsl";
import { enclosingForm } from "../enclosingForm";
import { effectsBody, notFound, readBody } from "../http";
import { dataGet, dataHas, dataSet, emptyToNull, expandKey } from "../validation/data";
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

function formRules(form: FormBuilder) {
	const children = form.includedChildren();
	return { rules: collectRules(children), attributes: collectAttributes(children) };
}

/** POST forms/{name}: validate against the form's own rules, then onSubmit. */
const submitForm: Endpoint = {
	method: "POST",
	pattern: ["forms", ":name"],
	async run(ctx) {
		const form = ctx.resolved.s.reachableForm(arg(ctx, 0));
		const handler = form?.submitHandler();
		if (form === null || handler === undefined) {
			throw notFound(`Form "${arg(ctx, 0)}" is not submittable on this page.`);
		}
		const { rules, attributes } = formRules(form);
		const data = await validated(await readBody(ctx.request), rules, {
			attributes,
			hostRules: ctx.options.hostRules,
		});
		const result = await handler(baseCtx(ctx, { form: data }));
		return typeof result === "string"
			? { effects: Effects.make().redirect(result) }
			: effectsBody(result, Effects.make());
	},
};

/** POST actions/{name}: the enclosing form validates `payload.form` unless withoutValidation(). */
const runAction: Endpoint = {
	method: "POST",
	pattern: ["actions", ":name"],
	async run(ctx) {
		const name = arg(ctx, 0);
		const action = ctx.resolved.s.reachableAction(name);
		const handler = action?.handler();
		if (action === null || handler === undefined) {
			throw notFound(`Action "${name}" has no server handler on this page.`);
		}
		const payload = bag((await readBody(ctx.request)).payload);
		const base = baseCtx(ctx, payload);
		const form = await actionForm(ctx, name, {
			input: payload.form,
			gate: !action.skipsFormValidation(),
		});
		const result = await handler(form === null ? base : base.withForm(form));
		return typeof result === "string"
			? { effects: Effects.make().redirect(result) }
			: effectsBody(result, Effects.make());
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
	const { rules, attributes } = formRules(form);
	if (Object.keys(rules).length === 0) {
		return null;
	}
	if (!gate) {
		return declaredKeysOnly(emptyToNull(bag(input)), rules);
	}
	return validated(bag(input), rules, { attributes, hostRules: ctx.options.hostRules });
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
