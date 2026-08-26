import { usableTag } from "./daterangeLocale";

export function formatDay(date: Date | undefined, locale: string): string {
	if (!date) {
		return "";
	}
	return date.toLocaleDateString(usableTag(locale), { dateStyle: "medium" });
}
