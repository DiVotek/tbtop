import type { FieldFormProps } from "../fieldProps";
import { RichtextEditor } from "./editor";
import { RichtextCell, type RichtextValue } from "./richtextCell";
import { lexicalToPlainText } from "./textPreview";

export type { RichtextValue };
export { RichtextCell };

interface RichtextOptionsBag {
	placeholder?: string;
}

export function RichtextForm({
	value,
	onChange,
	options,
}: FieldFormProps<RichtextValue, RichtextOptionsBag>) {
	return (
		<RichtextEditor
			initialState={value ?? null}
			placeholder={options?.placeholder}
			onChange={(next) => {
				const text = lexicalToPlainText(next);
				onChange(text ? next : null);
			}}
		/>
	);
}
