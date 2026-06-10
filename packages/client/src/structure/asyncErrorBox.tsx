import { useTranslation } from "../i18n/i18n";

/** Shared error box for async block states (form/table/chart). */
export function AsyncErrorBox({ testId, message }: { testId: string; message?: string }) {
	const t = useTranslation();
	return (
		<div
			className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
			data-testid={testId}
		>
			{message ?? t("state.error")}
		</div>
	);
}
