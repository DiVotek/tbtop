/**
 * Active-filter chips under the toolbar: one per applied filter, each removed
 * in one click, plus "Clear filters" once there are two or more.
 */
import { X } from "lucide-react";
import { useMultiResolvedLabels } from "../../fields/asyncMultiOptions";
import {
	type AsyncMultiOptionsBag,
	type AsyncSingleOptionsBag,
	type ResolvedState,
	useSingleResolvedLabel,
} from "../../fields/asyncOptions";
import type { StaticOption } from "../../fields/selectShared";
import { useLocale, useTranslation } from "../../i18n/i18n";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { useClientActionContext } from "../actionContext";
import { type ActiveFilter, formatFilterValue, toStrings } from "./filterChipValue";

interface FilterChipsProps {
	filters: ActiveFilter[];
	onRemove: (name: string) => void;
	onClear: () => void;
}

type ChipBag = AsyncSingleOptionsBag & { options?: StaticOption[]; multiple?: boolean };

export function FilterChips({ filters, onRemove, onClear }: FilterChipsProps) {
	const t = useTranslation();
	if (filters.length === 0) {
		return null;
	}
	return (
		<div className="flex flex-wrap items-center gap-1.5" data-testid="table-filter-chips">
			{filters.map((f) => (
				<FilterChip key={f.name} filter={f} onRemove={onRemove} />
			))}
			{filters.length > 1 && (
				<Button
					variant="ghost"
					size="xs"
					onClick={onClear}
					data-testid="table-filter-chips-clear"
				>
					{t("table.filters.clear")}
				</Button>
			)}
		</div>
	);
}

function FilterChip({
	filter,
	onRemove,
}: {
	filter: ActiveFilter;
	onRemove: (name: string) => void;
}) {
	const bag = (filter.node.options ?? {}) as ChipBag;
	const isAsync = typeof bag.onLoad === "function";
	const isMulti = filter.node.kind === "tags" || bag.multiple === true;
	if (isAsync && isMulti) {
		return <AsyncMultiChip filter={filter} bag={bag} onRemove={onRemove} />;
	}
	if (isAsync) {
		return <AsyncSingleChip filter={filter} bag={bag} onRemove={onRemove} />;
	}
	return <ChipView filter={filter} options={bag.options} onRemove={onRemove} />;
}

interface AsyncChipProps {
	filter: ActiveFilter;
	bag: ChipBag;
	onRemove: (name: string) => void;
}

function AsyncSingleChip({ filter, bag, onRemove }: AsyncChipProps) {
	const state = useSingleResolvedLabel({
		ctx: useClientActionContext(),
		fieldName: filter.name,
		value: toStrings(filter.value)[0] ?? null,
		opts: bag,
	});
	return <ResolvedChip filter={filter} bag={bag} state={state} onRemove={onRemove} />;
}

function AsyncMultiChip({ filter, bag, onRemove }: AsyncChipProps) {
	const state = useMultiResolvedLabels({
		ctx: useClientActionContext(),
		fieldName: filter.name,
		value: toStrings(filter.value),
		opts: bag as unknown as AsyncMultiOptionsBag,
	});
	return <ResolvedChip filter={filter} bag={bag} state={state} onRemove={onRemove} />;
}

function ResolvedChip({ filter, bag, state, onRemove }: AsyncChipProps & { state: ResolvedState }) {
	if (state.kind === "loading") {
		return <ChipView filter={filter} text="…" onRemove={onRemove} />;
	}
	const options = [...(bag.options ?? []), ...Object.values(state.labels)];
	return <ChipView filter={filter} options={options} onRemove={onRemove} />;
}

interface ChipViewProps {
	filter: ActiveFilter;
	onRemove: (name: string) => void;
	options?: StaticOption[];
	/** Overrides the formatted value (e.g. while an async label loads). */
	text?: string;
}

function ChipView({ filter, onRemove, options, text }: ChipViewProps) {
	const t = useTranslation();
	const { locale } = useLocale();
	const value =
		text ??
		formatFilterValue({ kind: filter.node.kind, value: filter.value, options, locale, t });
	const caption = value === undefined ? filter.label : `${filter.label}: ${value}`;
	return (
		<Badge
			variant="secondary"
			className="h-7 max-w-80 gap-1 pr-0.5 pl-2.5"
			data-testid={`table-filter-chip-${filter.name}`}
		>
			<span className="truncate" title={caption}>
				<span className="text-muted-foreground">{filter.label}</span>
				{value !== undefined && <span className="font-medium">: {value}</span>}
			</span>
			<Button
				variant="ghost"
				size="icon-xs"
				className="size-5 rounded-full"
				aria-label={t("table.filters.remove").replace("{filter}", caption)}
				data-testid={`table-filter-chip-remove-${filter.name}`}
				onClick={() => onRemove(filter.name)}
			>
				<X className="size-3" />
			</Button>
		</Badge>
	);
}
