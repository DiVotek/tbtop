import type { ActionCtx, HandlerResult } from "./actions";
import { Effects } from "./effects";
import type { Form } from "./form";
import type { Resolved } from "./resolve";
import { project, tableQuery } from "./tableQuery";
import { emptyToNull, json, laravelErrors } from "./wire";

type Endpoint = (resolved: Resolved, name: string, request: Request) => Promise<Response>;

/** `{path}/{segment}/{name}` → handler, keyed by method (routes/admin.php). */
export const ENDPOINTS: Record<string, { method: string; run: Endpoint }> = {
	forms: { method: "POST", run: submitForm },
	actions: { method: "POST", run: runAction },
	tables: { method: "GET", run: tableData },
};

async function submitForm(resolved: Resolved, name: string, request: Request): Promise<Response> {
	const form = resolved.forms.get(name);
	if (form?.submitHandler === undefined) {
		return json({ message: `Form "${name}" has no onSubmit.` }, 404);
	}
	const validated = await validate(form, emptyToNull(await request.json()));
	if (validated instanceof Response) {
		return validated;
	}
	return respond(await form.submitHandler(baseCtx(resolved, request, { form: validated })));
}

async function runAction(resolved: Resolved, name: string, request: Request): Promise<Response> {
	const action = resolved.actions.get(name);
	if (action?.handler === undefined) {
		return json({ message: `Action "${name}" has no server handler on this page.` }, 404);
	}
	const body = (await request.json()) as { payload?: Record<string, unknown> };
	const payload = body.payload ?? {};
	const enclosing = action.form ? resolved.forms.get(action.form.name) : undefined;
	const form =
		enclosing && payload.form !== undefined
			? await validate(enclosing, emptyToNull(payload.form))
			: {};
	if (form instanceof Response) {
		return form;
	}
	const row = (payload.row as Record<string, unknown>) ?? {};
	const selection = (payload.selection as (string | number)[]) ?? [];
	return respond(await action.handler(baseCtx(resolved, request, { form, row, selection })));
}

async function tableData(resolved: Resolved, name: string, request: Request): Promise<Response> {
	const table = resolved.tables.get(name);
	if (table?.source === undefined) {
		return json({ message: `Table "${name}" has no row source.` }, 404);
	}
	const query = tableQuery(table, new URL(request.url).searchParams);
	const { rows, total } = await table.source(query, { params: resolved.ctx.params, request });
	const data = rows.map((row) => project(table, row));
	return json({ data: { data, total, page: query.page, perPage: query.perPage } });
}

async function validate(form: Form, input: unknown): Promise<Record<string, unknown> | Response> {
	const result = await form.schema().safeParseAsync(input ?? {});
	if (result.success) {
		return result.data as Record<string, unknown>;
	}
	const errors = laravelErrors(result.error);
	return json({ message: "The given data was invalid.", errors }, 422);
}

function baseCtx(resolved: Resolved, request: Request, extra: Partial<ActionCtx>): ActionCtx {
	return { form: {}, row: {}, selection: [], params: resolved.ctx.params, request, ...extra };
}

function respond(result: HandlerResult): Response {
	if (typeof result === "string") {
		return json({ effects: Effects.make().redirect(result) });
	}
	return json({ effects: result ?? Effects.make() });
}
