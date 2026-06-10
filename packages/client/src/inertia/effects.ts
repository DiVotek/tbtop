import { router } from "@inertiajs/react";
import type { ClientActionContext, NotificationConfig } from "../structure/types";

export interface ServerEffect {
	kind: "notify" | "redirect" | "refreshTable" | "resetForm" | "closeModal";
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

function applyEffect(effect: ServerEffect, ctx: EffectContext): void {
	if (effect.kind === "notify") {
		ctx.notify({ kind: effect.level ?? "success", message: effect.message ?? "" });
	} else if (effect.kind === "redirect" && effect.href) {
		router.visit(effect.href);
	} else if (effect.kind === "refreshTable") {
		refreshTable(ctx);
	} else if (effect.kind === "resetForm") {
		ctx.form?.reset();
	} else if (effect.kind === "closeModal") {
		ctx.modal?.close();
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
