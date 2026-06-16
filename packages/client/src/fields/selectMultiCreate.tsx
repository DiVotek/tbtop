import { useState } from "react";
import type { FieldFormProps } from "./fieldProps";
import { SelectCreateDialog } from "./selectCreateDialog";
import type { SelectCreateConfig, SelectOptionsBag, SelectValueType } from "./selectShared";

interface WithMultiCreateProps extends FieldFormProps<SelectValueType, SelectOptionsBag> {
	resolvedLabels?: Record<string, string>;
	children: React.ReactNode;
}

/**
 * Wraps multi-select with a "+ Create" affordance.
 * On success: appends the new value (no duplicates), stashes label for async chips.
 */
export function WithMultiCreateAffordance({
	name,
	value,
	onChange,
	options,
	resolvedLabels,
	children,
}: WithMultiCreateProps) {
	const [open, setOpen] = useState(false);
	const create = options?.create as SelectCreateConfig | undefined;

	if (!create) {
		return <>{children}</>;
	}

	function handleSuccess(newValue: string, label: string): void {
		const current = Array.isArray(value) ? value : [];
		if (current.includes(newValue)) {
			setOpen(false);
			return;
		}
		if (resolvedLabels) {
			resolvedLabels[newValue] = label;
		}
		onChange([...current, newValue]);
		setOpen(false);
	}

	return (
		<div className="flex flex-col gap-1">
			{children}
			<button
				type="button"
				data-testid={`select-create-${name}`}
				onClick={() => setOpen(true)}
				className="self-start text-xs text-primary underline"
			>
				+ Create
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
