import { useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { useClientActionContext } from "../structure/actionContext";
import { FormSkeleton } from "../structure/defaults";
import { renderAsyncError } from "../structure/renderAsyncError";
import { useMultiResolvedLabels } from "./asyncOptions";
import { useAsyncSearch } from "./asyncSearch";
import { type FieldFormProps, fieldId } from "./fieldProps";
import { Chips, type TagsOptionsBag } from "./tagsShared";

export function AsyncTagsForm(props: FieldFormProps<string[], TagsOptionsBag>) {
	const t = useTranslation();
	const opts = props.options ?? {};
	const ctx = useClientActionContext();
	const [search, setSearch] = useState("");
	const current = Array.isArray(props.value) ? props.value : [];
	const resolved = useMultiResolvedLabels({ ctx, fieldName: props.name, value: current, opts });
	const searchState = useAsyncSearch({ ctx, query: opts.query, search });
	if (resolved.kind === "loading") {
		return <>{opts.loading ?? <FormSkeleton />}</>;
	}
	if (searchState.kind === "error") {
		return <>{renderAsyncError(opts.error, searchState.message, <FormSkeleton />)}</>;
	}
	const rows = searchState.kind === "ready" ? searchState.rows : [];
	const hasOnLoad = opts.onLoad !== undefined;
	const visible = hasOnLoad ? current.filter((v) => v in resolved.labels) : current;
	function add(v: string): void {
		if (current.includes(v)) {
			return;
		}
		props.onChange([...current, v]);
	}
	function remove(v: string): void {
		props.onChange(current.filter((x) => x !== v));
	}
	return (
		<fieldset
			className="flex flex-col gap-2 rounded border border-input bg-background p-2"
			data-testid={`tags-${props.name}`}
			onBlur={props.onBlur}
		>
			<div className="flex flex-wrap gap-2">
				<Chips
					name={props.name}
					value={visible}
					onRemove={remove}
					labelFor={(v) => resolved.labels[v] ?? v}
					disabled={props.disabled}
				/>
			</div>
			<input
				id={fieldId({ id: props.id, name: props.name })}
				value={search}
				disabled={props.disabled}
				onChange={(e) => setSearch(e.target.value)}
				className="bg-transparent text-sm outline-none"
				placeholder={t("field.search.placeholder")}
			/>
			{searchState.kind === "loading" ? (
				(opts.loading ?? <FormSkeleton />)
			) : (
				<AsyncSuggestions
					rows={rows}
					opts={opts}
					current={current}
					onPick={add}
					disabled={props.disabled}
				/>
			)}
		</fieldset>
	);
}

interface SuggestionsInput {
	rows: unknown[];
	opts: TagsOptionsBag;
	current: string[];
	onPick: (v: string) => void;
	disabled?: boolean;
}

function AsyncSuggestions({ rows, opts, current, onPick, disabled }: SuggestionsInput) {
	return (
		<div role="listbox" className="flex flex-wrap gap-2">
			{rows.map((row) => {
				const v = String(opts.optionValue?.(row) ?? "");
				const lbl = opts.optionLabel?.(row) ?? v;
				const selected = current.includes(v);
				return (
					<button
						key={v}
						type="button"
						role="option"
						aria-selected={selected}
						disabled={selected || disabled}
						onClick={() => onPick(v)}
						className="rounded border border-input bg-background px-2 py-1 text-xs disabled:opacity-50"
					>
						{lbl}
					</button>
				);
			})}
		</div>
	);
}
