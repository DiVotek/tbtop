import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { Input } from "../ui/input";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";

const MASK = "••••••••";

interface PasswordOptionsBag {
	placeholder?: string;
	autoComplete?: "current-password" | "new-password" | "off";
}

export function PasswordCell({ value }: FieldCellProps<string>) {
	if (value === null || value === undefined || value === "") {
		return null;
	}
	return <span>{MASK}</span>;
}

export function PasswordForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	options,
}: FieldFormProps<string, PasswordOptionsBag>) {
	const t = useTranslation();
	const [visible, setVisible] = useState(false);
	const inputId = id ?? name;
	const label = visible ? t("field.password.hide") : t("field.password.show");
	const Icon = visible ? EyeOffIcon : EyeIcon;
	return (
		<div className="relative">
			<Input
				id={inputId}
				name={name}
				type={visible ? "text" : "password"}
				autoComplete={options?.autoComplete ?? "current-password"}
				placeholder={options?.placeholder}
				value={typeof value === "string" ? value : ""}
				onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
				onBlur={onBlur}
				className="pr-9"
			/>
			<button
				type="button"
				aria-label={label}
				aria-pressed={visible}
				onClick={() => setVisible((v) => !v)}
				className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-6 w-6 text-muted-foreground hover:text-foreground"
			>
				<Icon className="h-4 w-4" aria-hidden />
			</button>
		</div>
	);
}
