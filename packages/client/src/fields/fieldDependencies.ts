import { useEffect, useRef } from "react";
import { useNearestFormController } from "../structure/formContext";
import { isEqual } from "../structure/formController";

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
	initialKey: string;
	initialValue: unknown;
	onChange: (next: null) => void;
}

/**
 * Clears this field when a watched parent changes; the clear cascades downstream.
 *
 * A field mounts before the record's values reach it, so the parent landing
 * afterwards reads as a parent change and would wipe a saved value the user
 * never touched. The record's own (parents, value) pair is never invalid, so a
 * transition arriving at exactly that pair is hydration, not a change. Checking
 * the value too matters: a key-only rule would also skip the reset when the user
 * re-picks the original parent under a different child.
 */
function useDependentReset(args: ResetArgs): void {
	const { depsKey, hasDeps, keep } = args;
	const prevKeyRef = useRef(depsKey);
	const onChangeRef = useRef(args.onChange);
	onChangeRef.current = args.onChange;
	const valueRef = useRef(args.value);
	valueRef.current = args.value;
	const initialKeyRef = useRef(args.initialKey);
	initialKeyRef.current = args.initialKey;
	const initialValueRef = useRef(args.initialValue);
	initialValueRef.current = args.initialValue;
	useEffect(() => {
		if (!hasDeps || keep || prevKeyRef.current === depsKey) {
			prevKeyRef.current = depsKey;
			return;
		}
		prevKeyRef.current = depsKey;
		const atInitial =
			depsKey === initialKeyRef.current && isEqual(valueRef.current, initialValueRef.current);
		if (atInitial) {
			return;
		}
		if (hasValue(valueRef.current)) {
			onChangeRef.current(null);
		}
	}, [depsKey, hasDeps, keep]);
}

export interface UseFieldDependenciesArgs {
	name: string;
	config: DependencyConfig;
	value: unknown;
	onChange: (next: null) => void;
}

/** Resolves parent values from the form controller, gates fetch, and cascades resets. */
export function useFieldDependencies({
	name,
	config,
	value,
	onChange,
}: UseFieldDependenciesArgs): DependencyState {
	const ctrl = useNearestFormController();
	const parents = config.dependsOn ?? [];
	const hasDeps = parents.length > 0;
	const { deps, ready } = readDeps(parents, ctrl?.data ?? {});
	const depsKey = hasDeps ? JSON.stringify(deps) : "";
	const initial = ctrl?.initial ?? {};
	useDependentReset({
		depsKey,
		hasDeps,
		keep: config.keepValue === true,
		value,
		initialKey: hasDeps ? JSON.stringify(readDeps(parents, initial).deps) : "",
		initialValue: initial[name],
		onChange,
	});
	const disabledByParent = hasDeps && !ready && config.whenParentEmpty !== "empty";
	return { hasDeps, deps, depsKey, ready, disabledByParent };
}
