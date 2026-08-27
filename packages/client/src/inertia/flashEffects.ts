import type { ModalStack } from "../structure/modalStack";
import type { ClientActionContext } from "../structure/types";
import type { ServerEffect } from "./effects";
import { applyCopyToClipboard, applyNotify, applyRedirect, refreshTable } from "./effects";

/**
 * Context for effects arriving via native Inertia flash (AdminPage.tsx): a
 * fresh page load, outside any action/form/table render position. `table`
 * and `form` are omitted from the type entirely (not merely optional) so a
 * handler that reaches for ctx.form fails to compile instead of silently
 * no-op'ing via `?.()`. Open modals survive a same-page redirect
 * (preserveState), so the page-level stack stands in for a nearest ctx.modal.
 * Contrast effects.ts's ActionEffectContext, which carries all of them.
 */
export type FlashEffectContext = Pick<ClientActionContext, "notify"> &
	Partial<Pick<ClientActionContext, "t">> & { modals: ModalStack };

const FLASH_EFFECT_KINDS = [
	"notify",
	"redirect",
	"refreshTable",
	"copyToClipboard",
	"closeModal",
] as const;

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
	// The topmost open modal is the one the submit came from; none open → no-op.
	closeModal: (_effect, ctx) => void ctx.modals.closeTop(),
};

/**
 * Executes the subset of the effect vocabulary that can act on a fresh page
 * load, with no action/form/table render position behind it: notify,
 * redirect, refreshTable, copyToClipboard, and closeModal (through the
 * page-level modal stack). The other three kinds (resetForm/haltModal/
 * setFormData) require a form or modal body that flash delivery cannot
 * supply — Effects::make()->haltModal() etc. from a form-submit handler is a
 * dead combination today. That is reported here with a console warning
 * rather than silently doing nothing: the full-context dispatch
 * (executeEffects, effects.ts) can't even express that gap, because
 * FlashEffectContext has no ctx.form to silently no-op through.
 * Effects run in the order sent (closeModal before redirect, typically).
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
