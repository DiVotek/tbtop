import type { FieldCellProps, FieldFormProps } from "./fieldProps";
import { optionLabel } from "./optionLabel";
import { AsyncTagsForm } from "./tagsAsync";
import { ClosedTagsForm } from "./tagsClosed";
import { OpenTagsForm } from "./tagsOpen";
import { LabelChips, type TagsOptionsBag } from "./tagsShared";

export function TagsCell({ value, options }: FieldCellProps<string[], TagsOptionsBag>) {
	if (!Array.isArray(value) || value.length === 0) {
		return null;
	}
	return <LabelChips value={value} labelFor={(v) => optionLabel(v, options?.options)} />;
}

export function TagsForm(props: FieldFormProps<string[], TagsOptionsBag>) {
	const opts = props.options ?? {};
	if (opts.query) {
		return <AsyncTagsForm {...props} />;
	}
	if (opts.options) {
		return <ClosedTagsForm {...props} />;
	}
	return <OpenTagsForm {...props} />;
}
