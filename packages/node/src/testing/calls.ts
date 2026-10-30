import { fail } from "./assert";
import type { TestResponse } from "./client";
import { FormTester } from "./formTester";
import { ModalTester } from "./modalTester";
import { type Effect, Result } from "./result";
import { type Bag, bag, type PageVisit } from "./visit";
import * as wire from "./wire";

/** What a call sends: the form values, the row and the selection. */
export interface Call {
	form: Bag;
	row: Bag;
	selection: unknown[];
}

/** Call an action the way its spec says the client would. */
export async function runAction(visit: PageVisit, entry: wire.Entry, call: Call): Promise<Result> {
	const name = entry.node.name ?? "";
	const spec = wire.spec(entry.node);
	if (spec.type === "server") {
		const form = { ...visit.record(entry.form), ...call.form };
		return postAction(
			visit,
			{ name, needs: spec.needs ?? [], form: entry.form },
			{ ...call, form },
		);
	}
	if (spec.type === "modal") {
		return (await openModal(visit, entry.node, call)).fill(call.form).submit();
	}
	if (spec.type === "submit") {
		const owner = spec.form ?? entry.form ?? fail(`Submit action [${name}] sits in no form.`);
		return new FormTester(visit, owner, visit.record(owner)).fill(call.form).submit();
	}
	fail(`Action [${name}] is a [${spec.type ?? "?"}] action and makes no server call.`);
}

export interface ServerAction {
	name: string;
	needs: string[];
	/** The form whose labels the error messages use. */
	form: string | null;
}

/** POST actions/{name} with the payload its needs ask for. */
export async function postAction(
	visit: PageVisit,
	action: ServerAction,
	call: Call,
): Promise<Result> {
	const { name, needs } = action;
	const payload: Bag = {
		...(needs.includes("form") ? { form: call.form } : {}),
		...(Object.keys(call.row).length > 0 ? { row: call.row } : {}),
		...(call.selection.length > 0 || needs.includes("selection")
			? { selection: call.selection }
			: {}),
	};
	const response = await visit.http.action(visit.endpoint("action", name), payload);
	const body = bag(response.json);
	return new Result({
		response,
		effects: response.status === 200 ? ((body.effects ?? []) as Effect[]) : [],
		errors: response.status === 422 ? (bag(body.errors) as Record<string, string[]>) : {},
		subject: `Action [${name}]`,
		labels: visit.labels(action.form),
	});
}

/** A form submit: back to the page with the session's errors or flashed effects, or a redirect. */
export async function submitForm(visit: PageVisit, form: string, data: Bag): Promise<Result> {
	const response = await visit.http.submit(visit.endpoint("form", form), data, visit.url);
	const location = response.headers.get("location");
	const back = location !== null && sameUrl(location, visit.url);
	const followed = back ? bag((await visit.http.visit(visit.url)).json) : {};
	const errors = Object.fromEntries(
		Object.entries(bag(bag(followed.props).errors)).map(([k, v]) => [
			k,
			[v].flat().map(String),
		]),
	);
	const effects = (bag(followed.flash)["tbtop.effects"] ?? []) as Effect[];
	return new Result({
		response,
		effects: Object.keys(errors).length === 0 ? effects : [],
		errors,
		subject: `Form [${form}]`,
		labels: visit.labels(form),
		redirect: back ? null : (location ?? response.headers.get("x-inertia-location")),
	});
}

/** Open a modal: its query() runs with the row and selection, nothing is submitted. */
export async function openModal(
	visit: PageVisit,
	node: wire.WireNode,
	call: Omit<Call, "form">,
): Promise<ModalTester> {
	const name = node.name ?? "";
	const spec = wire.spec(node);
	if (spec.type !== "modal") {
		fail(`Action [${name}] is not a modal.`);
	}
	const body = spec.body ?? {};
	const form = wire.ofKind([body], "form")[0]?.node.name ?? null;
	const { row, selection } = call;
	const response = spec.query === true ? await loadModal(visit, name, call) : null;
	const data = loadedData(response) ?? visit.record(form);
	return new ModalTester(visit, { name, body, form, data, row, selection, response });
}

function loadModal(
	visit: PageVisit,
	name: string,
	{ row, selection }: Omit<Call, "form">,
): Promise<TestResponse> {
	const payload = {
		...(Object.keys(row).length > 0 ? { row } : {}),
		...(selection.length > 0 ? { selection } : {}),
	};
	return visit.http.action(`${visit.endpoint("action", name)}/data`, payload);
}

/** What a modal's query() returned, when it answered with an object. */
function loadedData(response: TestResponse | null): Bag | null {
	const data = response?.status === 200 ? bag(response.json).data : null;
	return data !== null && typeof data === "object" ? (data as Bag) : null;
}

const sameUrl = (a: string, b: string) =>
	new URL(a, "http://localhost").href === new URL(b, "http://localhost").href;
