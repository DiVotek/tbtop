import { type ActionBuilder, type FormBuilder, Node } from "../../dsl";
import { actionSearchDescendants, collect, resolveActionNode } from "../../dsl/walk";
import { enclosingForm } from "../enclosingForm";
import type { Resolved } from "../resolve";
import { AgentError } from "./answer";
import { describeForm, unfillableReason } from "./formArgs";
import { describeTable } from "./tableArgs";

type Entry = Record<string, unknown>;
type Excluded = { id: string; reason: string };

/** The action behind `name` when this user may run it over MCP, else null. */
export function exposedAction(resolved: Resolved, name: string): ActionBuilder | null {
	const action = resolved.s.reachableAction(name);
	return action?.isMcpEnabled() === true ? action : null;
}

/**
 * PageSurface::describe(): what a built page offers an agent. Server actions
 * and onSubmit forms are one kind, executables; then the queryable tables and
 * what was left out, and why.
 */
export async function describeSurface(resolved: Resolved, withValues = false) {
	const listing: Listing = { executables: [], excluded: [] };
	await listActions(resolved, listing, withValues);
	await listForms(resolved, listing, withValues);
	return {
		executables: listing.executables,
		tables: await tables(resolved),
		excluded: [...listing.excluded, ...clientOnly(resolved)],
	};
}

interface Listing {
	executables: Entry[];
	excluded: Excluded[];
}

/** Records the entry, or why it is left out when its form cannot pass over MCP. */
async function list(
	listing: Listing,
	at: { id: string; reason: string | null },
	entry: () => Promise<Entry>,
) {
	if (at.reason === null) {
		listing.executables.push(await entry());
	} else {
		listing.excluded.push({ id: at.id, reason: at.reason });
	}
}

async function listActions(
	resolved: Resolved,
	listing: Listing,
	withValues: boolean,
): Promise<void> {
	const tableOf = actionTables([resolved.tree, ...resolved.headerActions], null);
	for (const name of resolved.s.collectedActions().keys()) {
		const id = `${resolved.page.path}:${name}`;
		const action = exposedAction(resolved, name);
		if (action?.getSpec()?.type === "custom") {
			listing.excluded.push({
				id,
				reason: "client-only custom action: it runs in the browser",
			});
			continue;
		}
		if (action?.handler() === undefined) {
			continue;
		}
		const form = enclosingForm(resolved, name);
		const reason = await unfillableReason(form, !action.skipsFormValidation());
		await list(listing, { id, reason }, () =>
			describeAction(id, action, { form, table: tableOf.get(name), withValues }),
		);
	}
}

async function listForms(resolved: Resolved, listing: Listing, withValues: boolean): Promise<void> {
	for (const name of resolved.s.collectedForms().keys()) {
		const form = resolved.s.reachableForm(name);
		if (form?.submitHandler() === undefined || resolved.s.collectedActions().has(name)) {
			continue;
		}
		const id = `${resolved.page.path}:${name}`;
		const reason = await unfillableReason(form, true);
		await list(listing, { id, reason }, async () => ({
			id,
			kind: "form",
			...(await describeForm(form, withValues)),
		}));
	}
}

/**
 * PageSurface::brief(): describeSurface() cut to an index for the bare
 * search(): executables as id, kind and label, tables by name, no forms.
 */
export async function briefSurface(resolved: Resolved) {
	const surface = await describeSurface(resolved);
	return {
		executables: surface.executables.map((entry) =>
			Object.fromEntries(
				Object.entries({ id: entry.id, kind: entry.kind, label: entry.label }).filter(
					([, v]) => v !== undefined && v !== null,
				),
			),
		),
		tables: surface.tables.map((table) => table.table),
		excluded: surface.excluded,
	};
}

/**
 * The executable `name` as execute() runs it: its action (null for an onSubmit
 * form) and the form it submits. Throws for what search() does not list.
 */
export async function executable(resolved: Resolved, name: string) {
	const id = `${resolved.page.path}:${name}`;
	const refused = new AgentError(`"${id}" is not executable here. Call search() for this page.`);
	if (resolved.s.collectedActions().has(name)) {
		const action = exposedAction(resolved, name);
		const form = enclosingForm(resolved, name);
		const validated = action !== null && !action.skipsFormValidation();
		if (action?.handler() === undefined || (await unfillableReason(form, validated)) !== null) {
			throw refused;
		}
		return { action, form };
	}
	const form = resolved.s.reachableForm(name);
	if (form?.submitHandler() !== undefined) {
		if ((await unfillableReason(form, true)) !== null) {
			throw refused;
		}
		return { action: null, form };
	}
	if (clientOnly(resolved).some((entry) => entry.id === id)) {
		throw refused;
	}
	throw new AgentError(`Unknown executable "${id}". Call search() for this page.`);
}

async function describeAction(
	id: string,
	action: ActionBuilder,
	at: { form: FormBuilder | null; table: string | undefined; withValues: boolean },
): Promise<Entry> {
	const options = resolveActionNode(action)?.options ?? {};
	const confirm = options.confirm as { title?: unknown } | undefined;
	const needs = (action.getSpec()?.needs as string[] | undefined) ?? [];
	return Object.fromEntries(
		Object.entries({
			id,
			kind: "action",
			label: options.label,
			confirm: confirm?.title,
			needs: needs.length > 0 ? needs : undefined,
			table: at.table,
			form: at.form === null ? undefined : await describeForm(at.form, at.withValues),
		}).filter(([, v]) => v !== undefined && v !== null),
	);
}

async function tables(resolved: Resolved): Promise<Entry[]> {
	const queryable = [...resolved.s.collectedTables().keys()]
		.map((name) => resolved.s.reachableTable(name))
		.filter((table) => table?.queryClosure() !== undefined);
	return Promise.all(queryable.map((table) => describeTable(table as NonNullable<typeof table>)));
}

/** Browser-only parts, listed so a page is not silently empty to an agent. */
function clientOnly(resolved: Resolved): Excluded[] {
	const id = (name: string) => `${resolved.page.path}:${name}`;
	const reorderable = [...resolved.s.collectedTables().keys()].filter(
		(name) => resolved.s.reachableTable(name)?.reorderColumn() != null,
	);
	const library = collect(resolved.tree, (n) => n instanceof Node && n.kind === "mediaLibrary");
	return [
		...(library.length > 0
			? [
					{
						id: id("mediaLibrary"),
						reason: "client-only media library: it runs in the browser",
					},
				]
			: []),
		...reorderable.map((name) => ({
			id: id(`${name}.reorder`),
			reason: "drag-reorder runs in the browser",
		})),
	];
}

/** Action name → the table whose action lists (or modals) hold it; the first placement wins. */
function actionTables(nodes: unknown[], table: string | null, map = new Map<string, string>()) {
	for (const entry of nodes) {
		const node = resolveActionNode(entry);
		if (node === null) {
			continue;
		}
		if (node.kind === "action" && node.name != null && table !== null && !map.has(node.name)) {
			map.set(node.name, table);
		}
		const scope = node.kind === "table" ? (node.name ?? null) : table;
		actionTables(actionSearchDescendants(node), scope, map);
	}
	return map;
}
