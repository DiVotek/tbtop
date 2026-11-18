import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { nullableCell } from "./cellHelpers";
import { asString, type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";
import {
	type SecretState,
	SecretStoredView,
	type SecretValue,
	secretStateOf,
	serializeSecret,
} from "./secretPasswordForm";

const MASK = "••••••••";

interface PasswordOptionsBag {
	placeholder?: string;
	autoComplete?: "current-password" | "new-password" | "off";
	secret?: SecretState;
}

export function PasswordCell({ value }: FieldCellProps<string>) {
	return nullableCell(value, (v) => (v === "" ? null : <span>{MASK}</span>));
}

/** A secret() password submits nothing until it is replaced or cleared (see serializeSecret). */
export function serializePassword(value: unknown, options: unknown): unknown {
	return secretStateOf(options) === undefined ? value : serializeSecret(value);
}

export function PasswordForm(props: FieldFormProps<string, PasswordOptionsBag>) {
	const secret = secretStateOf(props.options);
	if (secret === undefined) {
		return <PasswordInput {...props} />;
	}
	// The form holds `undefined` for a secret left alone; FieldFormProps types it as null.
	const value = props.value as SecretValue;
	const onChange = props.onChange as (next?: string | null) => void;
	if (!secret.filled) {
		const placeholder = props.options?.placeholder;
		return <SecretNotSetInput {...props} placeholder={placeholder} />;
	}
	if (typeof value !== "string") {
		return (
			<SecretStoredView
				id={fieldId(props)}
				state={secret}
				value={value}
				onChange={onChange}
				disabled={props.disabled}
				describedBy={props.describedBy}
			/>
		);
	}
	return <SecretReplaceInput {...props} onCancel={() => onChange()} />;
}

function SecretNotSetInput(
	props: FieldFormProps<string, PasswordOptionsBag> & { placeholder?: string },
) {
	const t = useTranslation();
	const options = {
		...props.options,
		placeholder: props.placeholder ?? t("field.secret.not_set"),
	};
	return <PasswordInput {...props} options={options} autoComplete="new-password" />;
}

function SecretReplaceInput(
	props: FieldFormProps<string, PasswordOptionsBag> & { onCancel: () => void },
) {
	const t = useTranslation();
	const { onCancel, ...rest } = props;
	return (
		<div className="flex items-center gap-2">
			<div className="min-w-0 flex-1">
				<PasswordInput
					{...rest}
					autoComplete="new-password"
					autoFocus
					onChange={(next) => props.onChange(next ?? "")}
				/>
			</div>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={onCancel}
				disabled={props.disabled}
			>
				{t("field.secret.cancel")}
			</Button>
		</div>
	);
}

interface PasswordInputProps extends FieldFormProps<string, PasswordOptionsBag> {
	autoComplete?: PasswordOptionsBag["autoComplete"];
	autoFocus?: boolean;
}

function PasswordInput({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	invalid,
	describedBy,
	required,
	options,
	autoComplete,
	autoFocus,
}: PasswordInputProps) {
	const t = useTranslation();
	const [visible, setVisible] = useState(false);
	const inputId = fieldId({ id, name });
	const label = visible ? t("field.password.hide") : t("field.password.show");
	const Icon = visible ? EyeOffIcon : EyeIcon;
	return (
		<div className="relative">
			<Input
				id={inputId}
				name={name}
				type={visible ? "text" : "password"}
				autoComplete={options?.autoComplete ?? autoComplete ?? "current-password"}
				// biome-ignore lint/a11y/noAutofocus: focus follows the user's own Replace click
				autoFocus={autoFocus}
				placeholder={options?.placeholder}
				value={asString(value)}
				onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
				onBlur={onBlur}
				disabled={disabled}
				aria-invalid={invalid || undefined}
				aria-required={required || undefined}
				aria-describedby={describedBy}
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
