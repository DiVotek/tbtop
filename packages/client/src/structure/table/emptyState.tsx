/**
 * EmptyState — empty table body. Separates "no records" from "no filter
 * matches", offering a reset in the latter. A table's emptyState() config
 * overrides the heading/description/icon when provided.
 */
import { Inbox, SearchX } from "lucide-react";
import { useTranslation } from "../../i18n/i18n";
import { Button } from "../../ui/button";
import type { TableEmptyState } from "../tableBlock.types";
import { resolveIcon } from "./iconRegistry";

interface EmptyStateProps {
	hasActiveFilters: boolean;
	onReset: () => void;
	config?: TableEmptyState;
}

export function EmptyState({ hasActiveFilters, onReset, config }: EmptyStateProps) {
	const t = useTranslation();
	const ConfigIcon = config?.icon ? resolveIcon(config.icon) : undefined;
	const Icon = ConfigIcon ?? (hasActiveFilters ? SearchX : Inbox);
	const heading =
		config?.heading ??
		(hasActiveFilters ? t("table.empty.no_results") : t("table.empty.no_records"));
	const description =
		config?.description ??
		(hasActiveFilters ? t("table.empty.no_results_hint") : t("table.empty.no_records_hint"));

	// New-gen shape: spacing, icon tile and typography come from the `cn-empty*`
	// rules in `ui/presets/style-preset-*.css`; the structural flex classes are
	// upstream's Empty/EmptyHeader/EmptyMedia(variant="icon") shells, and the
	// icon now sits inside the header as upstream nests it. Deltas: the reset
	// button stays a direct child (no `cn-empty-content` wrapper for a single
	// button), and the icon drops its `size-6` so the preset sizes it.
	return (
		<div
			className="cn-empty flex w-full min-w-0 flex-1 flex-col items-center justify-center text-center text-balance"
			data-testid="table-empty"
		>
			<div className="cn-empty-header flex max-w-sm flex-col items-center">
				<span className="cn-empty-media cn-empty-media-icon flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0">
					<Icon aria-hidden />
				</span>
				<p className="cn-empty-title cn-font-heading">{heading}</p>
				<p className="cn-empty-description text-muted-foreground">{description}</p>
			</div>
			{hasActiveFilters && (
				<Button
					variant="outline"
					size="sm"
					onClick={onReset}
					data-testid="table-empty-reset"
				>
					{t("table.empty.reset")}
				</Button>
			)}
		</div>
	);
}
