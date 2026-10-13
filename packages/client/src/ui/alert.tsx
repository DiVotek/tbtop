// Semantic-only alert: structural `cn-*` classes, visuals in
// `ui/presets/style-preset-*.css`. Our deltas on top of upstream: the
// info/success/warning/danger/gray/primary color variants (upstream has only
// default/destructive), the `icon` prop, and the title/description wrappers.
// Upstream AlertTitle/AlertDescription are plain divs; ours keep the
// paragraph typography so existing blocks render unchanged.
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

const alertVariants = cva("cn-alert group/alert relative w-full", {
	variants: {
		variant: {
			default: "cn-alert-variant-default",
			info: "cn-alert-variant-info",
			success: "cn-alert-variant-success",
			warning: "cn-alert-variant-warning",
			danger: "cn-alert-variant-danger",
			gray: "cn-alert-variant-gray",
			primary: "cn-alert-variant-primary",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>["variant"]>;

export type { AlertVariant };

export interface AlertProps
	extends HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof alertVariants> {
	/** Optional leading icon, laid out beside the text rather than over it. */
	icon?: ReactNode;
}

export function Alert({ className, variant, icon, children, ...props }: AlertProps) {
	return (
		<div
			role="alert"
			data-slot="alert"
			className={cn(alertVariants({ variant }), className)}
			{...props}
		>
			{icon}
			<div className="min-w-0 flex-1">{children}</div>
		</div>
	);
}

export interface AlertTitleProps extends HTMLAttributes<HTMLParagraphElement> {}

export function AlertTitle({ className, ...props }: AlertTitleProps) {
	return <p data-slot="alert-title" className={cn("cn-alert-title", className)} {...props} />;
}

export interface AlertDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export function AlertDescription({ className, ...props }: AlertDescriptionProps) {
	return (
		<p
			data-slot="alert-description"
			className={cn("cn-alert-description text-sm [&_p]:leading-relaxed", className)}
			{...props}
		/>
	);
}
