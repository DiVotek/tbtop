import { useNearestFormController } from "./formContext";

/**
 * Dirty state of the nearest enclosing form: `true`/`false` inside a form,
 * `null` outside any form. Single read point for "is the nearest form
 * dirty" — mirrors the `FormController.isDirty` value `useUnsavedGuard`'s
 * caller (`FormControllerBody`) already holds directly from its own
 * controller. Blocks mounted deeper in the tree, with no direct controller
 * reference, go through this hook instead of re-deriving dirty state.
 */
export function useFormDirty(): boolean | null {
	const ctrl = useNearestFormController();
	return ctrl === null ? null : ctrl.isDirty;
}
