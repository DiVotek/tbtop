import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

// Inlined shadcn Alert primitive — no external dep needed for this simple component.

const alertVariants = cva(
	"flex w-full gap-3 rounded-lg border px-4 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-current",
	{
		variants: {
			variant: {
				default: "bg-background text-foreground",
				info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
				success:
					"border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
				warning:
					"border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100",
				danger: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
				gray: "border-border bg-muted text-foreground",
				primary:
					"border-primary/20 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/20",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

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
		<div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
			{icon}
			<div className="min-w-0 flex-1">{children}</div>
		</div>
	);
}

export interface AlertTitleProps extends HTMLAttributes<HTMLParagraphElement> {}

export function AlertTitle({ className, ...props }: AlertTitleProps) {
	return (
		<p className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />
	);
}

export interface AlertDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export function AlertDescription({ className, ...props }: AlertDescriptionProps) {
	return <p className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />;
}
