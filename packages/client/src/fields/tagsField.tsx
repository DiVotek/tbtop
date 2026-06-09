import type { FieldCellProps, FieldFormProps } from "./fieldProps";
import { AsyncTagsForm } from "./tagsAsync";
import { ClosedTagsForm } from "./tagsClosed";
import { OpenTagsForm } from "./tagsOpen";
import type { TagOption, TagsOptionsBag } from "./tagsShared";

export function TagsCell({ value, options }: FieldCellProps<string[], TagsOptionsBag>) {
	if (!Array.isArray(value) || value.length === 0) {
		return null;
	}
	return (
		<div className="flex flex-wrap gap-1">
			{value.map((v) => (
				<span
					key={v}
					className="rounded border border-input bg-muted px-1.5 py-0.5 text-xs"
				>
					{labelFor(v, options?.options)}
				</span>
			))}
		</div>
	);
}

function labelFor(value: string, choices: TagOption[] | undefined): string {
	const match = choices?.find((o) => o.value === value);
	return match?.label ?? value;
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
