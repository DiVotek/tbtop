import { OTPInput, OTPInputContext } from "input-otp";
import { MinusIcon } from "lucide-react";
import { type ComponentProps, useContext } from "react";

import { cn } from "../lib/cn";
import { inputFontClass } from "./input";

// New-gen shape: structural classes live here as `cn-*` names, the visual
// definitions live in `ui/presets/style-preset-*.css`. Our delta on top of
// upstream: the hidden input carries the shared input font class. Upstream's
// `cn-input-otp-input` / `cn-input-otp-caret` have no preset definition, so
// they are not emitted.

function InputOTP({
	className,
	containerClassName,
	...props
}: ComponentProps<typeof OTPInput> & { containerClassName?: string }) {
	return (
		<OTPInput
			data-slot="input-otp"
			containerClassName={cn(
				"cn-input-otp flex items-center has-disabled:opacity-50",
				containerClassName,
			)}
			className={cn("disabled:cursor-not-allowed", inputFontClass, className)}
			{...props}
		/>
	);
}

function InputOTPGroup({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			data-slot="input-otp-group"
			className={cn("cn-input-otp-group flex items-center", className)}
			{...props}
		/>
	);
}

function InputOTPSlot({ index, className, ...props }: ComponentProps<"div"> & { index: number }) {
	const ctx = useContext(OTPInputContext);
	const { char, hasFakeCaret, isActive } = ctx?.slots[index] ?? {};
	return (
		<div
			data-slot="input-otp-slot"
			data-active={isActive}
			className={cn(
				"cn-input-otp-slot relative flex items-center justify-center data-[active=true]:z-10",
				className,
			)}
			{...props}
		>
			{char}
			{hasFakeCaret ? (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
					<div className="cn-input-otp-caret-line" />
				</div>
			) : null}
		</div>
	);
}

function InputOTPSeparator(props: ComponentProps<"div">) {
	return (
		<div
			data-slot="input-otp-separator"
			className="cn-input-otp-separator flex items-center"
			role="separator"
			{...props}
		>
			<MinusIcon />
		</div>
	);
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };
