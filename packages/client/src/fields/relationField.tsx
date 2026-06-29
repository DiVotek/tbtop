import { useTranslation } from "../i18n/i18n";
import { useClientActionContext } from "../structure/actionContext";
import { FormSkeleton } from "../structure/defaults";
import { renderAsyncError } from "../structure/renderAsyncError";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { AsyncSingleOptionsBag } from "./asyncOptions";
import { useSingleResolvedLabel } from "./asyncOptions";
import { useAsyncSearch } from "./asyncSearch";
import { nullableCell } from "./cellHelpers";
import {
	type DependencyConfig,
	type DependencyState,
	useFieldDependencies,
} from "./fieldDependencies";
import { type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";
import { coerceSelectValue } from "./selectShared";

export interface RelationOptionsBag extends AsyncSingleOptionsBag, DependencyConfig {
	searchable?: boolean;
	labelKey?: string;
}

export function RelationCell({ value }: FieldCellProps<unknown>) {
	return nullableCell(value, (v) => {
		if (Array.isArray(v)) {
			return <span>{v.length} items</span>;
		}
		if (typeof v === "object" && v !== null) {
			return <span>{relationObjectLabel(v)}</span>;
		}
		return <span>{String(v)}</span>;
	});
}

/** Pull a display label from an eager-loaded related record, else its id, else raw JSON. */
function relationObjectLabel(obj: object): string {
	if ("name" in obj && typeof obj.name === "string") {
		return obj.name;
	}
	if ("label" in obj && typeof obj.label === "string") {
		return obj.label;
	}
	if ("title" in obj && typeof obj.title === "string") {
		return obj.title;
	}
	if ("id" in obj && (typeof obj.id === "string" || typeof obj.id === "number")) {
		return String(obj.id);
	}
	return JSON.stringify(obj);
}

export function RelationForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	options,
}: FieldFormProps<string, RelationOptionsBag>) {
	const ctx = useClientActionContext();
	const opts = options ?? {};
	const coerced = coerceSelectValue(value);
	const current = typeof coerced === "string" ? coerced : null;
	const dep = useFieldDependencies({ config: opts, value: current, onChange });
	const isResolveGated = dep.hasDeps && !dep.ready;
	const boundOpts = dep.hasDeps ? bindDeps(opts, dep.deps) : opts;
	const resolved = useSingleResolvedLabel({
		ctx,
		fieldName: name,
		value: isResolveGated ? null : current,
		opts: boundOpts,
		refetchKey: dep.depsKey,
	});

	if (resolved.kind === "loading") {
		return <FormSkeleton />;
	}

	return (
		<RelationSelectInner
			id={id}
			name={name}
			value={current}
			onChange={onChange}
			onBlur={onBlur}
			disabled={disabled || dep.disabledByParent}
			options={boundOpts}
			resolved={resolved}
			dep={dep}
		/>
	);
}

function bindDeps(opts: RelationOptionsBag, deps: Record<string, string>): RelationOptionsBag {
	const { query, onLoad } = opts;
	return {
		...opts,
		query: query ? (ctx, search) => query(ctx, search, deps) : undefined,
		onLoad: onLoad ? (ctx, value) => onLoad(ctx, value, deps) : undefined,
	};
}

interface RelationSelectInnerProps {
	id?: string;
	name: string;
	value: string | null;
	onChange: (next: string | null) => void;
	onBlur?: () => void;
	disabled?: boolean;
	options: RelationOptionsBag;
	resolved: { kind: "ready"; labels: Record<string, string> };
	dep: DependencyState;
}

function RelationSelectInner({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	options,
	resolved,
	dep,
}: RelationSelectInnerProps) {
	const t = useTranslation();
	const ctx = useClientActionContext();
	const gated = dep.hasDeps && !dep.ready;
	const search = useAsyncSearch({
		ctx,
		query: gated ? undefined : options.query,
		search: "",
		refetchKey: dep.depsKey,
	});
	if (search.kind === "loading") {
		return <FormSkeleton />;
	}
	if (search.kind === "error") {
		return <>{renderAsyncError(undefined, search.message, <FormSkeleton />)}</>;
	}

	const rows: unknown[] = gated ? [] : search.rows;
	const display = value === null ? undefined : (resolved.labels[value] ?? value);

	return (
		<Select
			value={value ?? ""}
			onValueChange={(next) => onChange(next === "" ? null : next)}
			disabled={disabled}
		>
			<SelectTrigger
				id={fieldId({ id, name })}
				onBlur={onBlur}
				data-testid={`relation-${name}`}
				className="w-full"
			>
				<SelectValue placeholder={t("field.select.placeholder")}>{display}</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{rows.map((row) => {
					const v = String(options.optionValue?.(row) ?? "");
					const lbl = String(options.optionLabel?.(row) ?? v);
					return (
						<SelectItem key={v} value={v}>
							{lbl}
						</SelectItem>
					);
				})}
			</SelectContent>
		</Select>
	);
}
