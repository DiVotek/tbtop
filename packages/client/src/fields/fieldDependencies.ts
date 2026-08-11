import { useEffect, useRef } from "react";
import { useNearestFormController } from "../structure/formContext";

export interface DependencyConfig {
	dependsOn?: string[];
	keepValue?: boolean;
	whenParentEmpty?: "disabled" | "empty";
}

export interface DependencyState {
	hasDeps: boolean;
	deps: Record<string, string>;
	depsKey: string;
	ready: boolean;
	disabledByParent: boolean;
}

function scalarToString(raw: unknown): string {
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

function hasValue(v: unknown): boolean {
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

interface ResetArgs {
	depsKey: string;
	hasDeps: boolean;
	keep: boolean;
	value: unknown;
	onChange: (next: null) => void;
}

/** Clears this field when a watched parent changes; the clear cascades downstream. */
function useDependentReset({ depsKey, hasDeps, keep, value, onChange }: ResetArgs): void {
	const prevKeyRef = useRef(depsKey);
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const valueRef = useRef(value);
	valueRef.current = value;
	useEffect(() => {
		if (!hasDeps || keep || prevKeyRef.current === depsKey) {
			prevKeyRef.current = depsKey;
			return;
		}
		prevKeyRef.current = depsKey;
		if (hasValue(valueRef.current)) {
			onChangeRef.current(null);
		}
	}, [depsKey, hasDeps, keep]);
}

export interface UseFieldDependenciesArgs {
	config: DependencyConfig;
	value: unknown;
	onChange: (next: null) => void;
}

/** Resolves parent values from the form controller, gates fetch, and cascades resets. */
export function useFieldDependencies({
	config,
	value,
	onChange,
}: UseFieldDependenciesArgs): DependencyState {
	const ctrl = useNearestFormController();
	const parents = config.dependsOn ?? [];
	const hasDeps = parents.length > 0;
	const { deps, ready } = readDeps(parents, ctrl?.data ?? {});
	const depsKey = hasDeps ? JSON.stringify(deps) : "";
	useDependentReset({ depsKey, hasDeps, keep: config.keepValue === true, value, onChange });
	const disabledByParent = hasDeps && !ready && config.whenParentEmpty !== "empty";
	return { hasDeps, deps, depsKey, ready, disabledByParent };
}
