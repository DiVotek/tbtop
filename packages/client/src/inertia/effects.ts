import { router } from "@inertiajs/react";
import type { ClientActionContext, NotificationConfig } from "../structure/types";

export interface ServerEffect {
	kind: "notify" | "redirect" | "refreshTable" | "resetForm" | "closeModal" | "haltModal";
	message?: string;
	level?: NotificationConfig["kind"];
	href?: string;
	table?: string;
	form?: string;
}

type EffectContext = Pick<ClientActionContext, "notify" | "table" | "form" | "modal">;

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
};

function applyEffect(effect: ServerEffect, ctx: EffectContext): void {
	EFFECT_HANDLERS[effect.kind]?.(effect, ctx);
}

function applyNotify(effect: ServerEffect, ctx: EffectContext): void {
	ctx.notify({ kind: effect.level ?? "success", message: effect.message ?? "" });
}

function applyRedirect(effect: ServerEffect): void {
	if (effect.href) {
		router.visit(effect.href);
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
