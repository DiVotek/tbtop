import type { FieldFormProps } from "./fieldProps";
import type { TagsOptionsBag } from "./tagsShared";

export function ClosedTagsForm({
	name,
	value,
	onChange,
	onBlur,
	options,
	disabled,
}: FieldFormProps<string[], TagsOptionsBag>) {
	const choices = options?.options ?? [];
	const current = Array.isArray(value) ? value : [];
	function toggle(v: string): void {
		const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
		onChange(next);
	}
	return (
		<div
			role="listbox"
			aria-multiselectable="true"
			className="flex flex-wrap gap-2"
			data-testid={`tags-${name}`}
			onBlur={onBlur}
		>
			{choices.map((opt) => {
				const selected = current.includes(opt.value);
				return (
					<button
						key={opt.value}
						type="button"
						role="option"
						aria-selected={selected}
						disabled={disabled}
						onClick={() => toggle(opt.value)}
						className={
							selected
								? "rounded border border-primary bg-primary px-2 py-1 text-primary-foreground text-xs disabled:opacity-50"
								: "rounded border border-input bg-background px-2 py-1 text-xs disabled:opacity-50"
						}
					>
						{opt.label}
					</button>
				);
			})}
		</div>
	);
}
