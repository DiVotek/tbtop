import type { SerializedEditorState } from "lexical";
import { TruncatedTextCell } from "../cellHelpers";
import type { FieldCellProps } from "../fieldProps";
import { lexicalToPlainText } from "./textPreview";

export type RichtextValue = SerializedEditorState;

export function RichtextCell({ value }: FieldCellProps<RichtextValue>) {
	const text = lexicalToPlainText(value);
	if (!text) {
		return null;
	}
	return <TruncatedTextCell value={text} />;
}
