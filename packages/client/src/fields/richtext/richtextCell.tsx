import type { SerializedEditorState } from "lexical";
import { TruncatedTextCell } from "../cellHelpers";
import type { FieldCellProps } from "../fieldProps";
import { lexicalToPreviewText } from "./textPreview";

export type RichtextValue = SerializedEditorState;

interface RichtextCellOptions {
	embeds?: Array<{ kind: string; label: string }>;
}

export function RichtextCell({
	value,
	options,
}: FieldCellProps<RichtextValue, RichtextCellOptions>) {
	const labels = Object.fromEntries((options?.embeds ?? []).map((e) => [e.kind, e.label]));
	const text = lexicalToPreviewText(value, labels);
	if (!text) {
		return null;
	}
	return <TruncatedTextCell value={text} />;
}
