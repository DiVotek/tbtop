import { useTranslation } from "../i18n/i18n";
import { useClientActionContext } from "../structure/actionContext";
import { FormSkeleton } from "../structure/defaults";
import { renderAsyncError } from "../structure/renderAsyncError";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { AsyncSingleOptionsBag } from "./asyncOptions";
import { useSingleResolvedLabel } from "./asyncOptions";
import { useAsyncSearch } from "./asyncSearch";
import { nullableCell } from "./cellHelpers";
import { type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";
import { coerceSelectValue } from "./selectShared";

export interface RelationOptionsBag extends AsyncSingleOptionsBag {
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
	const resolved = useSingleResolvedLabel({ ctx, fieldName: name, value: current, opts });

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
			disabled={disabled}
			options={opts}
			resolved={resolved}
		/>
	);
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
}: RelationSelectInnerProps) {
	const t = useTranslation();
	const ctx = useClientActionContext();
	const search = useAsyncSearch({ ctx, query: options.query, search: "" });

	if (search.kind === "loading") {
		return <FormSkeleton />;
	}
	if (search.kind === "error") {
		return <>{renderAsyncError(undefined, search.message, <FormSkeleton />)}</>;
	}

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
				{search.rows.map((row) => {
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
