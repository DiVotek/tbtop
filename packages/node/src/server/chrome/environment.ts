/** One indicator: a label and a color name; either falls back to the environment's. */
export interface EnvironmentBadge {
	label?: string;
	color?: string;
}

/**
 * The header's environment badge (ConfiguresEnvironmentIndicator.php).
 * `true` shows the built-in label and color for any environment but
 * production; a map overrides them per environment (a color, a badge, or
 * `false` to hide); a function decides per request, `null` hides.
 */
export type EnvironmentIndicator =
	| boolean
	| Record<string, string | false | EnvironmentBadge>
	| ((request: Request) => EnvironmentBadge | null | Promise<EnvironmentBadge | null>);

/** Built-in color per common environment name; anything else is gray. */
const COLORS: Record<string, string> = {
	local: "success",
	development: "success",
	dev: "success",
	testing: "info",
	test: "info",
	staging: "warning",
	stage: "warning",
	production: "danger",
};

/** Hidden unless the author lists them in the overrides map. */
const HIDDEN = ["production"];

/** Fails at createAdmin(): the badge needs a name, and Workers have no APP_ENV to read. */
export function assertEnvironment(environment?: string, indicator?: EnvironmentIndicator): void {
	if (indicator === undefined || indicator === false) {
		return;
	}
	if (typeof environment !== "string" || environment === "") {
		throw new Error(
			'environmentIndicator needs `environment` (e.g. "staging"): pass your APP_ENV or NODE_ENV.',
		);
	}
	if (typeof indicator === "object") {
		Object.entries(indicator).forEach(assertOverride);
	}
}

function assertOverride([env, override]: [string, unknown]): void {
	if (typeof override !== "string" && override !== false && !isBadge(override)) {
		throw new Error(
			`environmentIndicator["${env}"] must be a color, a { label, color } badge, or false.`,
		);
	}
}

/** The `tbtop.environment` prop: `{ label, color }`, or null when hidden. */
export async function environmentProp(
	request: Request,
	environment?: string,
	indicator?: EnvironmentIndicator,
): Promise<{ label: string; color: string } | null> {
	if (indicator === undefined || indicator === false || environment === undefined) {
		return null;
	}
	if (typeof indicator === "function") {
		const badge = await indicator(request);
		if (badge !== null && !isBadge(badge)) {
			throw new Error("environmentIndicator() must return a { label, color } badge or null.");
		}
		return payload(badge, environment);
	}
	return fromOverrides(indicator === true ? {} : indicator, environment);
}

function fromOverrides(
	overrides: Record<string, string | false | EnvironmentBadge>,
	env: string,
): { label: string; color: string } | null {
	if (!(env in overrides)) {
		return HIDDEN.includes(env) ? null : payload({}, env);
	}
	const override = overrides[env];
	if (override === false || override === undefined) {
		return null;
	}
	return payload(typeof override === "string" ? { color: override } : override, env);
}

function payload(badge: EnvironmentBadge | null, env: string) {
	if (badge === null) {
		return null;
	}
	return {
		label: badge.label ?? env.charAt(0).toUpperCase() + env.slice(1),
		color: badge.color ?? COLORS[env] ?? "gray",
	};
}

function isBadge(value: unknown): value is EnvironmentBadge {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}
	return Object.entries(value).every(
		([key, v]) => (key === "label" || key === "color") && typeof v === "string",
	);
}
