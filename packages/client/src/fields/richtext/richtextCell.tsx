import type { SerializedEditorState } from "lexical";
import type { FieldCellProps } from "../fieldProps";
import { lexicalToPlainText } from "./textPreview";

export type RichtextValue = SerializedEditorState;

const CELL_PREVIEW_LIMIT = 80;

export function RichtextCell({ value }: FieldCellProps<RichtextValue>) {
	const text = lexicalToPlainText(value);
	if (!text) {
		return null;
	}
	const display =
		text.length > CELL_PREVIEW_LIMIT ? `${text.slice(0, CELL_PREVIEW_LIMIT)}…` : text;
	return <span title={text}>{display}</span>;
}
