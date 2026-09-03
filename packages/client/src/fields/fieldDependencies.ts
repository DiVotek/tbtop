import { createContext, createElement, type ReactNode, useContext } from "react";
import { useNearestFormController } from "../structure/formContext";
import type { FormController } from "../structure/types";

interface DependencyValues {
	data: Record<string, unknown>;
	initial: Record<string, unknown>;
}

const DependencyValuesContext = createContext<DependencyValues | null>(null);

function dependencyValues(
	provided: DependencyValues | null,
	controller: FormController | null,
): DependencyValues {
	return provided ?? { data: controller?.data ?? {}, initial: controller?.initial ?? {} };
}

export function FieldDependencyProvider({
	data,
	initial,
	children,
}: DependencyValues & { children: ReactNode }): ReactNode {
	return createElement(DependencyValuesContext.Provider, { value: { data, initial } }, children);
}

/** Row/filter-local field values when scoped, otherwise the nearest form's data. */
export function useFieldSourceData(): Record<string, unknown> {
	const ctrl = useNearestFormController();
	const provided = useContext(DependencyValuesContext);
	return dependencyValues(provided, ctrl).data;
}

export interface DependencyConfig {
	dependsOn?: string[];
	keepValue?: boolean;
	whenParentEmpty?: "disabled" | "empty";
}

export interface DependencyState {
	hasDeps: boolean;
	deps: Record<string, string>;
	depsKey: string;
	initialDepsKey: string;
	ready: boolean;
	disabledByParent: boolean;
}

/** Shared with useDependentResets — the same non-empty spelling for a deps key. */
export function scalarToString(raw: unknown): string {
	if (typeof raw === "boolean") {
		return raw ? "1" : "0";
	}
	if (typeof raw === "number") {
		return String(raw);
	}
	return typeof raw === "string" ? raw : "";
}

/**
 * Resolves one declared dependency name against the form data.
 *
 * A translatable field holds a locale map ({en: "…", uk: "…"}), never a
 * scalar, so a dependency on one is declared per locale — "title.en" — and
 * read out of the map here. Without this, such a dependency would resolve to
 * "" forever: the region's deps key would never change and it would never
 * reload (and a dependent field would stay permanently disabled).
 */
function readOne(name: string, data: Record<string, unknown>): string {
	const direct = scalarToString(data[name]);
	if (direct !== "" || name in data) {
		return direct;
	}
	const dot = name.indexOf(".");
	if (dot <= 0) {
		return "";
	}
	const parent = data[name.slice(0, dot)];
	if (parent === null || typeof parent !== "object" || Array.isArray(parent)) {
		return "";
	}
	return scalarToString((parent as Record<string, unknown>)[name.slice(dot + 1)]);
}

/** Shared with liveRegionBlock so a region's deps payload matches a dependent field's. */
export function readDeps(
	parents: string[],
	data: Record<string, unknown>,
): { deps: Record<string, string>; ready: boolean } {
	const deps: Record<string, string> = {};
	let ready = true;
	for (const name of parents) {
		const v = readOne(name, data);
		if (v === "") {
			ready = false;
		} else {
			deps[name] = v;
		}
	}
	return { deps, ready };
}

/** Shared with useDependentResets — the same emptiness rule a form-level reset uses. */
export function hasValue(v: unknown): boolean {
	if (v === null || v === undefined) {
		return false;
	}
	if (typeof v === "string") {
		return v !== "";
	}
	if (Array.isArray(v)) {
		return v.length > 0;
	}
	return true;
}

export interface UseFieldDependenciesArgs {
	config: DependencyConfig;
}

/**
 * Resolves parent values from the form controller and gates fetch/disabled
 * state. The reset-on-parent-change cascade itself is form-level now (see
 * useDependentResets) — a field can be unmounted (hidden by a condition,
 * inside a collapsed row) while its parent changes, so the reset can't live
 * in a per-field effect that only runs while mounted.
 */
export function useFieldDependencies({ config }: UseFieldDependenciesArgs): DependencyState {
	const ctrl = useNearestFormController();
	const provided = useContext(DependencyValuesContext);
	const { data, initial } = dependencyValues(provided, ctrl);
	const parents = config.dependsOn ?? [];
	const hasDeps = parents.length > 0;
	const { deps, ready } = readDeps(parents, data);
	const depsKey = hasDeps ? JSON.stringify(deps) : "";
	const initialDepsKey = hasDeps ? JSON.stringify(readDeps(parents, initial).deps) : "";
	const disabledByParent = hasDeps && !ready && config.whenParentEmpty !== "empty";
	return { hasDeps, deps, depsKey, initialDepsKey, ready, disabledByParent };
}
