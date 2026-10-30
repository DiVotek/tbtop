import { type ReactNode, useState } from "react";
import { useTranslation } from "../i18n/i18n";
import type { OptionMap } from "./asyncOptions";
import { type AffixOptions, InputGroup } from "./inputGroup";
import { SelectCreateDialog } from "./selectCreateDialog";
import type { SelectCreateConfig, StaticOption } from "./selectShared";

interface CreateAffordanceProps {
	name: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	invalid?: boolean;
	options?: AffixOptions & { create?: SelectCreateConfig };
	resolvedLabels?: OptionMap;
	/** Runs after the created option became the value — e.g. to refetch the list. */
	onCreated?: (option: StaticOption) => void;
	children: ReactNode;
}

/**
 * Wraps a single-value picker with the "+ Create" link and its mini-form
 * dialog when the server sent `create`; otherwise renders the control alone.
 * Shared by `select()->creatable()` and `relation()->creatable()`.
 */
export function CreateAffordance({
	name,
	onChange,
	disabled,
	invalid,
	options,
	resolvedLabels,
	onCreated,
	children,
}: CreateAffordanceProps) {
	const [open, setOpen] = useState(false);
	const t = useTranslation();
	const create = options?.create;
	const control = (
		<InputGroup options={options} disabled={disabled} invalid={invalid}>
			{children}
		</InputGroup>
	);
	if (!create) {
		return control;
	}

	function handleSuccess(value: string, label: string) {
		const option = { value, label };
		if (resolvedLabels) {
			resolvedLabels[value] = option;
		}
		onChange(value);
		onCreated?.(option);
		setOpen(false);
	}

	return (
		<div className="flex flex-col gap-1">
			{control}
			<button
				type="button"
				data-testid={`select-create-${name}`}
				disabled={disabled}
				onClick={() => !disabled && setOpen(true)}
				className="self-start text-xs text-primary underline disabled:cursor-not-allowed disabled:opacity-50"
			>
				+ {t("action.create")}
			</button>
			{open && (
				<SelectCreateDialog
					fieldName={name}
					config={create}
					onSuccess={handleSuccess}
					onClose={() => setOpen(false)}
				/>
			)}
		</div>
	);
}
