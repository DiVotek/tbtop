import type { FieldFormProps } from "../fieldProps";
import { RichtextEditor } from "./editor";
import type { EmbedDef } from "./embedContext";
import { RichtextCell, type RichtextValue } from "./richtextCell";
import { hasEmbedNode, lexicalToPlainText } from "./textPreview";

export type { RichtextValue };
export { RichtextCell };

interface RichtextOptionsBag {
	placeholder?: string;
	embeds?: EmbedDef[];
}

export function RichtextForm({
	value,
	onChange,
	disabled,
	options,
}: FieldFormProps<RichtextValue, RichtextOptionsBag>) {
	return (
		<RichtextEditor
			initialState={value ?? null}
			placeholder={options?.placeholder}
			disabled={disabled}
			embeds={options?.embeds}
			onChange={(next) => {
				// Empty = no embed and no text: a document holding only a block is content.
				const empty = !hasEmbedNode(next) && lexicalToPlainText(next) === "";
				onChange(empty ? null : next);
			}}
		/>
	);
}
