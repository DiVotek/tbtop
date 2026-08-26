import { router } from "@inertiajs/react";
import { defaultMessages } from "../i18n/i18n";
import { copyToClipboard as writeClipboard } from "../lib/clipboard";
import {
	getAllRegisteredTableControllers,
	getRegisteredTableController,
} from "../structure/tableContext";
import type { ClientActionContext, NotificationConfig } from "../structure/types";
import { markServerRedirect } from "./navigationIntent";

export interface ServerEffect {
	kind:
		| "notify"
		| "redirect"
		| "refreshTable"
		| "resetForm"
		| "closeModal"
		| "haltModal"
		| "copyToClipboard"
		| "setFormData";
	message?: string;
	level?: NotificationConfig["kind"];
	href?: string;
	table?: string;
	form?: string;
	text?: string;
	/** setFormData: field name → replacement value (arbitrary JSON). */
	data?: Record<string, unknown>;
}

/**
 * Context for effects reaching the client from within an action/cell render
 * position (materializeActions.ts, editableCell.tsx): the full slice of
 * ClientActionContext an action handler runs with. table/form/modal stay
 * optional here because THEIR presence is legitimately positional (a page
 * action outside any table has no ctx.table) — but the fields themselves are
 * always part of the type, so every effect kind is at least reachable.
 * Contrast flashEffects.ts's FlashEffectContext, which omits them entirely.
 */
export type ActionEffectContext = Pick<
	ClientActionContext,
	"notify" | "table" | "form" | "modal" | "t"
>;

/**
 * Executes the closed server-effect vocabulary for an action/cell-save
 * response. refreshTable reaches every mounted table by name, not only the
 * one surrounding the effect — see refreshTable() below.
 */
export function executeEffects(effects: ServerEffect[], ctx: ActionEffectContext): void {
	for (const effect of effects) {
		applyEffect(effect, ctx);
	}
}

const EFFECT_HANDLERS: Record<
	ServerEffect["kind"],
	(effect: ServerEffect, ctx: ActionEffectContext) => void
> = {
	notify: applyNotify,
	redirect: (effect) => applyRedirect(effect),
	refreshTable: (effect, ctx) => refreshTable(effect, ctx.table),
	resetForm: (_effect, ctx) => ctx.form?.reset(),
	closeModal: (_effect, ctx) => ctx.modal?.close(),
	haltModal: (effect, ctx) => ctx.modal?.halt?.(effect.message ?? "", effect.level),
	copyToClipboard: (effect, ctx) => void applyCopyToClipboard(effect, ctx),
	setFormData: applySetFormData,
};

function applyEffect(effect: ServerEffect, ctx: ActionEffectContext): void {
	EFFECT_HANDLERS[effect.kind]?.(effect, ctx);
}

/** Shared with flashEffects.ts — notify has no positional dependency, so both dispatch tables use it directly. */
export function applyNotify(effect: ServerEffect, ctx: Pick<ClientActionContext, "notify">): void {
	ctx.notify({ kind: effect.level ?? "success", message: effect.message ?? "" });
}

/** Shared with flashEffects.ts — redirect touches only the router, so both dispatch tables use it directly. */
export function applyRedirect(effect: ServerEffect): void {
	if (effect.href) {
		// A server-authored redirect is an intentional navigation, not an
		// accidental page leave — see navigationIntent.ts for why the
		// unsaved-changes guard must not block it regardless of ordering.
		markServerRedirect();
		const samePage = new URL(effect.href, location.origin).pathname === location.pathname;
		router.visit(effect.href, { preserveState: samePage, preserveScroll: samePage });
	}
}

/**
 * Writes effect.text to the clipboard (via the shared helper, which falls
 * back to execCommand in non-secure contexts) and notifies on success. A
 * failed write (permission denied, no clipboard API and no execCommand
 * fallback) stays silent — there's nothing actionable to tell the user.
 * Shared with flashEffects.ts — clipboard writes have no positional dependency.
 */
export async function applyCopyToClipboard(
	effect: ServerEffect,
	ctx: Pick<ClientActionContext, "notify"> & Partial<Pick<ClientActionContext, "t">>,
): Promise<void> {
	if (!effect.text) {
		return;
	}
	if (!(await writeClipboard(effect.text))) {
		return;
	}
	const message = ctx.t
		? ctx.t("field.copyable.copied")
		: defaultMessages["field.copyable.copied"];
	ctx.notify({ kind: "success", message: message ?? "Copied" });
}

/**
 * Writes server-supplied values into the nearest form via `set`, never
 * `initial` — the form must stay dirty so the user still sees unsaved state.
 */
function applySetFormData(effect: ServerEffect, ctx: ActionEffectContext): void {
	if (!ctx.form) {
		console.warn("[tbtop] setFormData: no enclosing form — effect ignored.");
		return;
	}
	// Snapshot the keys once: setFieldError is a queued state update, so
	// ctx.form.fieldErrors does not change under this loop.
	const errorKeys = Object.keys(ctx.form.fieldErrors);
	for (const [field, value] of Object.entries(effect.data ?? {})) {
		if (!isTopLevelField(field)) {
			continue;
		}
		ctx.form.set(field, value);
		clearErrorsUnder(field, errorKeys, ctx.form);
	}
}

/**
 * `set` writes a literal key into the form bag, so a dotted path would add a
 * junk top-level entry ("blocks.0.title") next to the real field rather than
 * reaching into it — and that junk then serializes into the next submit.
 * Dotted paths are the likely author mistake here because error keys use them.
 */
function isTopLevelField(field: string): boolean {
	if (!field.includes(".")) {
		return true;
	}
	console.warn(
		`[tbtop] setFormData: key "${field}" is ignored — setFormData takes top-level field names, not dotted paths. Send the whole "${field.split(".")[0]}" value instead.`,
	);
	return false;
}

/**
 * Clears the written key and everything nested under it: repeater errors live
 * at dotted paths (`blocks.0.title`) and liftNestedErrors mirrors them onto
 * the root, so a replaced value must drop both or stale errors survive.
 */
function clearErrorsUnder(
	field: string,
	errorKeys: string[],
	form: NonNullable<ActionEffectContext["form"]>,
): void {
	const prefix = `${field}.`;
	for (const key of errorKeys) {
		if (key === field || key.startsWith(prefix)) {
			form.setFieldError(key, null);
		}
	}
}

/**
 * Table rows are fetched by the table itself (client.get), never carried as
 * Inertia props, so a named target or the nearest table (when the caller has
 * one — flash delivery never does) is refetched directly. Only when no table
 * is registered at all — this effect reached a page with no mounted table —
 * does a full reload remain meaningful.
 */
export function refreshTable(effect: ServerEffect, nearest?: ClientActionContext["table"]): void {
	if (effect.table) {
		getRegisteredTableController(effect.table)?.refresh();
		return;
	}
	if (nearest) {
		nearest.refresh();
		return;
	}
	const tables = getAllRegisteredTableControllers();
	if (tables.length > 0) {
		for (const table of tables) {
			table.refresh();
		}
		return;
	}
	router.reload();
}

export function readEffects(raw: unknown): ServerEffect[] {
	if (!Array.isArray(raw)) {
		return [];
	}
	return raw.filter((e): e is ServerEffect => !!e && typeof e === "object" && "kind" in e);
}
