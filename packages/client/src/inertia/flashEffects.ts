import type { ClientActionContext } from "../structure/types";
import type { ServerEffect } from "./effects";
import { applyCopyToClipboard, applyNotify, applyRedirect, refreshTable } from "./effects";

/**
 * Context for effects arriving via native Inertia flash (AdminPage.tsx): a
 * fresh page load, outside any action/form/table/modal render position. Only
 * `notify` is guaranteed — `table`/`form`/`modal` are omitted from the type
 * entirely (not merely optional) so a handler that reaches for ctx.form or
 * ctx.modal fails to compile instead of silently no-op'ing via `?.()`.
 * Contrast effects.ts's ActionEffectContext, which carries all of them.
 */
export type FlashEffectContext = Pick<ClientActionContext, "notify"> &
	Partial<Pick<ClientActionContext, "t">>;

const FLASH_EFFECT_KINDS = ["notify", "redirect", "refreshTable", "copyToClipboard"] as const;

type FlashEffectKind = (typeof FLASH_EFFECT_KINDS)[number];

function isFlashSafe(kind: ServerEffect["kind"]): kind is FlashEffectKind {
	return (FLASH_EFFECT_KINDS as readonly string[]).includes(kind);
}

const FLASH_EFFECT_HANDLERS: Record<
	FlashEffectKind,
	(effect: ServerEffect, ctx: FlashEffectContext) => void
> = {
	notify: applyNotify,
	redirect: (effect) => applyRedirect(effect),
	// No nearest table exists on a fresh page load — always the
	// named-registry / all-registered-tables / full-reload fallback.
	refreshTable: (effect) => refreshTable(effect),
	copyToClipboard: (effect, ctx) => void applyCopyToClipboard(effect, ctx),
};

/**
 * Executes the subset of the effect vocabulary that can act on a fresh page
 * load, with no action/form/table/modal render position behind it: notify,
 * redirect, refreshTable, and copyToClipboard. The other four kinds
 * (resetForm/closeModal/haltModal/setFormData) all require a form or modal
 * that flash delivery cannot supply — Effects::make()->haltModal() etc. from
 * a form-submit handler is a dead combination today. That is reported here
 * with a console warning rather than silently doing nothing: the full-context
 * dispatch (executeEffects, effects.ts) can't even express that gap, because
 * FlashEffectContext has no ctx.form/ctx.modal to silently no-op through.
 */
export function executeFlashEffects(effects: ServerEffect[], ctx: FlashEffectContext): void {
	for (const effect of effects) {
		if (!isFlashSafe(effect.kind)) {
			console.warn(
				`[tbtop] ${effect.kind}: not supported via Inertia flash — there is no enclosing form/modal on a fresh page load. Effect ignored.`,
			);
			continue;
		}
		FLASH_EFFECT_HANDLERS[effect.kind](effect, ctx);
	}
}
