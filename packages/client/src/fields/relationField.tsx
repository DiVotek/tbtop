import { useTranslation } from "../i18n/i18n";
import { FormSkeleton } from "../structure/defaults";
import { AsyncOptionCombobox } from "./asyncOptionCombobox";
import type { AsyncSingleOptionsBag } from "./asyncOptions";
import { nullableCell } from "./cellHelpers";
import type { DependencyConfig } from "./fieldDependencies";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";
import { type AffixOptions, InputGroup } from "./inputGroup";
import { coerceSelectValue } from "./selectShared";
import { useRemoteOptions } from "./useRemoteOptions";

export interface RelationOptionsBag extends AsyncSingleOptionsBag, DependencyConfig, AffixOptions {
	searchable?: boolean;
	labelKey?: string;
}

export function RelationCell({ value }: FieldCellProps<unknown>) {
	const t = useTranslation();
	return nullableCell(value, (v) => {
		if (Array.isArray(v)) {
			return <span>{t("field.relation.items").replace("{count}", String(v.length))}</span>;
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

/**
 * A relation differs from an async single select only in which endpoint answers
 * it, so it renders through the same combobox and shares the same protocol.
 */
export function RelationForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	invalid,
	options,
}: FieldFormProps<string, RelationOptionsBag>) {
	const coerced = coerceSelectValue(value);
	const current = typeof coerced === "string" ? coerced : null;
	const remote = useRemoteOptions({
		name,
		value: current,
		opts: options ?? {},
	});

	if (remote.isFirstLoad) {
		return <FormSkeleton />;
	}

	return (
		<InputGroup
			options={options}
			disabled={disabled || remote.dep.disabledByParent}
			invalid={invalid}
		>
			<AsyncOptionCombobox
				id={id}
				name={name}
				value={current}
				onChange={onChange}
				onBlur={onBlur}
				disabled={disabled || remote.dep.disabledByParent}
				invalid={invalid}
				opts={remote.opts}
				labels={remote.labels}
				dep={remote.dep}
				onRowsSeen={remote.noteRowsSeen}
			/>
		</InputGroup>
	);
}
