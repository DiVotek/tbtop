import { groupLabelledBy } from "../fieldChrome";
import { type FieldFormProps, fieldId } from "../fieldProps";
import { RichtextEditor } from "./editor";
import type { EmbedDef } from "./embedContext";
import { RichtextCell, type RichtextValue } from "./richtextCell";

export type { RichtextValue };
export { RichtextCell };

interface RichtextOptionsBag {
	label?: string;
	placeholder?: string;
	embeds?: EmbedDef[];
}

export function RichtextForm({
	id,
	name,
	value,
	onChange,
	disabled,
	invalid,
	describedBy,
	options,
}: FieldFormProps<RichtextValue, RichtextOptionsBag>) {
	const controlId = fieldId({ id, name });
	return (
		<RichtextEditor
			value={value ?? null}
			placeholder={options?.placeholder}
			disabled={disabled}
			embeds={options?.embeds}
			a11y={{
				id: controlId,
				labelledBy: groupLabelledBy(controlId, options?.label),
				describedBy,
				invalid,
			}}
			onChange={onChange}
		/>
	);
}
