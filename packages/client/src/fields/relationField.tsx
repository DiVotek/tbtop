import { useTranslation } from "../i18n/i18n";
import { Input } from "../ui/input";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";

export function RelationCell({ value }: FieldCellProps<string | string[]>) {
	if (value === null || value === undefined) {
		return null;
	}
	if (typeof value === "string") {
		return <span>{value}</span>;
	}
	if (Array.isArray(value)) {
		return <span>{value.length} items</span>;
	}
	return <code className="text-xs">{JSON.stringify(value)}</code>;
}

export function RelationForm({ id, name, value, onChange }: FieldFormProps<string>) {
	const t = useTranslation();
	return (
		<Input
			id={id ?? name}
			name={name}
			defaultValue={typeof value === "string" ? value : ""}
			placeholder={t("field.relation.placeholder")}
			onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
		/>
	);
}
