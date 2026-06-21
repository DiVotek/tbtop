import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useTranslation } from "../i18n/i18n";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/inputOtp";
import { nullableCell } from "./cellHelpers";
import { asString, type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";

const DEFAULT_LENGTH = 6;

interface OtpOptionsBag {
	length?: number;
	pattern?: string;
}

// One dot per entered character, so any configured length masks correctly.
export function OtpCell({ value }: FieldCellProps<string>) {
	return nullableCell(value, (v) => (v === "" ? null : <span>{"•".repeat(v.length)}</span>));
}

export function OtpForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	options,
}: FieldFormProps<string, OtpOptionsBag>) {
	const t = useTranslation();
	const length = options?.length ?? DEFAULT_LENGTH;
	const pattern = options?.pattern ?? REGEXP_ONLY_DIGITS;
	return (
		<InputOTP
			id={fieldId({ id, name })}
			name={name}
			maxLength={length}
			pattern={pattern}
			inputMode="numeric"
			value={asString(value)}
			onChange={(next) => onChange(next === "" ? null : next)}
			onBlur={onBlur}
			disabled={disabled}
			aria-label={t("field.otp.label")}
		>
			<InputOTPGroup>
				{Array.from({ length }, (_, i) => (
					<InputOTPSlot key={i} index={i} />
				))}
			</InputOTPGroup>
		</InputOTP>
	);
}
