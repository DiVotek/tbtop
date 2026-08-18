import { router } from "@inertiajs/react";
import { defaultMessages } from "../i18n/i18n";
import { copyToClipboard as writeClipboard } from "../lib/clipboard";
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

// "t" is optional: the native-Inertia-flash call site (AdminPage.tsx) builds
// a minimal ctx with only `notify` (no surrounding action/form/table exists
// on a fresh page load) — copyToClipboard falls back to defaultMessages
// directly when no translate function is available.
type EffectContext = Pick<ClientActionContext, "notify" | "table" | "form" | "modal"> &
	Partial<Pick<ClientActionContext, "t">>;

/**
 * Executes the closed server-effect vocabulary. A named refreshTable
 * without a surrounding table controller falls back to a page reload.
 */
export function executeEffects(effects: ServerEffect[], ctx: EffectContext): void {
	for (const effect of effects) {
		applyEffect(effect, ctx);
	}
}

const EFFECT_HANDLERS: Record<
	ServerEffect["kind"],
	(effect: ServerEffect, ctx: EffectContext) => void
> = {
	notify: applyNotify,
	redirect: (effect) => applyRedirect(effect),
	refreshTable: (_effect, ctx) => refreshTable(ctx),
	resetForm: (_effect, ctx) => ctx.form?.reset(),
	closeModal: (_effect, ctx) => ctx.modal?.close(),
	haltModal: (effect, ctx) => ctx.modal?.halt?.(effect.message ?? "", effect.level),
	copyToClipboard: (effect, ctx) => void applyCopyToClipboard(effect, ctx),
	setFormData: applySetFormData,
};

function applyEffect(effect: ServerEffect, ctx: EffectContext): void {
	EFFECT_HANDLERS[effect.kind]?.(effect, ctx);
}

function applyNotify(effect: ServerEffect, ctx: EffectContext): void {
	ctx.notify({ kind: effect.level ?? "success", message: effect.message ?? "" });
}

function applyRedirect(effect: ServerEffect): void {
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
 */
async function applyCopyToClipboard(effect: ServerEffect, ctx: EffectContext): Promise<void> {
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
function applySetFormData(effect: ServerEffect, ctx: EffectContext): void {
	if (!ctx.form) {
		console.warn("[tbtop] setFormData effect ignored: no enclosing form");
		return;
	}
	// Snapshot the keys once: setFieldError is a queued state update, so
	// ctx.form.fieldErrors does not change under this loop.
	const errorKeys = Object.keys(ctx.form.fieldErrors);
	for (const [field, value] of Object.entries(effect.data ?? {})) {
		ctx.form.set(field, value);
		clearErrorsUnder(field, errorKeys, ctx.form);
	}
}

/**
 * Clears the written key and everything nested under it: repeater errors live
 * at dotted paths (`blocks.0.title`) and liftNestedErrors mirrors them onto
 * the root, so a replaced value must drop both or stale errors survive.
 */
function clearErrorsUnder(
	field: string,
	errorKeys: string[],
	form: NonNullable<EffectContext["form"]>,
): void {
	const prefix = `${field}.`;
	for (const key of errorKeys) {
		if (key === field || key.startsWith(prefix)) {
			form.setFieldError(key, null);
		}
	}
}

function refreshTable(ctx: EffectContext): void {
	if (ctx.table) {
		ctx.table.refresh();
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
