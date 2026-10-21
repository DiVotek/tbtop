import { type ActionBuilder, type FormBuilder, type Node, walk } from "../dsl";
import type { Resolved } from "./resolve";

interface Enclosing {
	form: string | null;
	query: string | null;
}

/**
 * The form an action submits into (ActionFormRules.php): the closest form
 * above it, and only when the action reads the form (needs: ['form']).
 */
export function enclosingForm(resolved: Resolved, actionName: string): FormBuilder | null {
	const name = enclosing(resolved, actionName)?.form ?? null;
	return name === null ? null : resolved.s.reachableForm(name);
}

/** The closest query()-loading modal above the action: where the form's record came from. */
export function enclosingQueryAction(resolved: Resolved, actionName: string): ActionBuilder | null {
	const name = enclosing(resolved, actionName)?.query ?? null;
	return name === null ? null : resolved.s.reachableAction(name);
}

function enclosing(resolved: Resolved, actionName: string): Enclosing | null {
	const start = { form: null, query: null };
	return (
		search(resolved.tree, actionName, start) ??
		searchList(resolved.headerActions, actionName, start)
	);
}

function spec(node: Node): { needs?: string[]; query?: boolean } | null {
	const value = node.options.spec;
	return value !== null && typeof value === "object"
		? (value as { needs?: string[]; query?: boolean })
		: null;
}

function search(value: unknown, actionName: string, outer: Enclosing): Enclosing | null {
	const node = walk.resolveActionNode(value);
	if (node === null) {
		return null;
	}
	if (node.kind === "action" && node.name === actionName) {
		const readsForm = spec(node)?.needs?.includes("form") === true;
		return readsForm && outer.form !== null ? outer : null;
	}
	return searchList(walk.actionSearchDescendants(node), actionName, narrowed(node, outer));
}

/** The closest form and query-loading modal, as seen from inside `node`. */
function narrowed(node: Node, outer: Enclosing): Enclosing {
	const isForm = node.kind === "form" && node.name !== null;
	const loadsQuery = node.kind === "action" && node.name !== null && spec(node)?.query === true;
	return {
		form: isForm ? node.name : outer.form,
		query: loadsQuery ? node.name : outer.query,
	};
}

function searchList(children: unknown[], actionName: string, outer: Enclosing): Enclosing | null {
	for (const child of children) {
		const found = search(child, actionName, outer);
		if (found !== null) {
			return found;
		}
	}
	return null;
}
