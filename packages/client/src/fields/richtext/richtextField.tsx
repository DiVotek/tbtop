import { groupLabelledBy } from "../fieldChrome";
import { type FieldFormProps, fieldId } from "../fieldProps";
import { RichtextEditor } from "./editor";
import type { EmbedDef } from "./embedContext";
import { RichtextCell, type RichtextValue } from "./richtextCell";
import { hasEmbedNode, lexicalToPlainText } from "./textPreview";

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
			initialState={value ?? null}
			placeholder={options?.placeholder}
			disabled={disabled}
			embeds={options?.embeds}
			a11y={{
				id: controlId,
				labelledBy: groupLabelledBy(controlId, options?.label),
				describedBy,
				invalid,
			}}
			onChange={(next) => {
				// Empty = no embed and no text: a document holding only a block is content.
				const empty = !hasEmbedNode(next) && lexicalToPlainText(next) === "";
				onChange(empty ? null : next);
			}}
		/>
	);
}
