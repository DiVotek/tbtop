import type { Messages } from "./defaultMessages";

export type LocaleLoader = () => Promise<Messages | { default: Messages }>;

export async function loadMessages(loader: LocaleLoader): Promise<Messages> {
	const result = await loader();
	return isDefaultExport(result) ? result.default : result;
}

function isDefaultExport(value: Messages | { default: Messages }): value is { default: Messages } {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	if (!("default" in value)) {
		return false;
	}
	const inner = (value as { default: unknown }).default;
	return typeof inner === "object" && inner !== null;
}
