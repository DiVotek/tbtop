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
	disabled,
	options,
}: FieldFormProps<RichtextValue, RichtextOptionsBag>) {
	return (
		<RichtextEditor
			initialState={value ?? null}
			placeholder={options?.placeholder}
			disabled={disabled}
			onChange={(next) => {
				const text = lexicalToPlainText(next);
				onChange(text ? next : null);
			}}
		/>
	);
}
