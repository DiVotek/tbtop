import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useTranslation } from "../i18n/i18n";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/inputOtp";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";

const DEFAULT_LENGTH = 6;
const MASK = "••••••";

interface OtpOptionsBag {
	length?: number;
	pattern?: string;
}

export function OtpCell({ value }: FieldCellProps<string>) {
	if (value === null || value === undefined || value === "") {
		return null;
	}
	return <span>{MASK}</span>;
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
			id={id ?? name}
			name={name}
			maxLength={length}
			pattern={pattern}
			inputMode="numeric"
			value={typeof value === "string" ? value : ""}
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
