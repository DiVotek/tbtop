import { useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { FieldSkeleton } from "../structure/defaults";
import { AsyncOptionCombobox } from "./asyncOptionCombobox";
import type { AsyncSingleOptionsBag } from "./asyncOptions";
import { nullableCell } from "./cellHelpers";
import { CreateAffordance } from "./createAffordance";
import type { DependencyConfig, DependencyState } from "./fieldDependencies";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";
import type { AffixOptions } from "./inputGroup";
import { coerceSelectValue, type SelectCreateConfig } from "./selectShared";
import { useRemoteOptions } from "./useRemoteOptions";

export interface RelationOptionsBag extends AsyncSingleOptionsBag, DependencyConfig, AffixOptions {
	searchable?: boolean;
	labelKey?: string;
	/** Set by `creatable()`: a "+ Create" link opens this mini-form. */
	create?: SelectCreateConfig;
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
	const [refetchKey, setRefetchKey] = useState(0);

	if (remote.isFirstLoad) {
		return <FieldSkeleton />;
	}

	const isDisabled = disabled || remote.dep.disabledByParent;
	return (
		<CreateAffordance
			name={name}
			onChange={onChange}
			disabled={isDisabled}
			invalid={invalid}
			options={bindCreateDeps(remote.opts, remote.dep)}
			onCreated={(option) => {
				// The new row carries its label; the refetch lists it next time.
				remote.noteRowsSeen({ [option.value]: option });
				setRefetchKey((k) => k + 1);
			}}
		>
			<AsyncOptionCombobox
				id={id}
				name={name}
				value={current}
				onChange={onChange}
				onBlur={onBlur}
				disabled={isDisabled}
				invalid={invalid}
				opts={remote.opts}
				labels={remote.labels}
				dep={remote.dep}
				refetchKey={refetchKey}
				onRowsSeen={remote.noteRowsSeen}
			/>
		</CreateAffordance>
	);
}

/** The dialog posts only the mini-form; a dependent relation's closure also needs the parents. */
function bindCreateDeps(opts: RelationOptionsBag, dep: DependencyState): RelationOptionsBag {
	const create = opts.create;
	if (!create || !dep.hasDeps) {
		return opts;
	}
	return {
		...opts,
		create: { ...create, post: (ctx, data) => create.post(ctx, data, dep.deps) },
	};
}
