/**
 * ModalShell — layout shell for all feature dialogs.
 *
 * Wraps ResponsiveDialog + ResponsiveDialogContent with canonical padding,
 * scrollable body, standard header (title + optional description), and footer.
 * Feature dialogs that use ModalShell make zero layout decisions themselves.
 *
 * Sizes map to the canonical max-w values used across existing dialogs:
 *   sm   → sm:max-w-md   (mediaDetail, confirm)
 *   md   → sm:max-w-lg   (default; matches Dialog/DialogContent built-in)
 *   lg   → sm:max-w-2xl
 *   full → sm:max-w-4xl  (picker modal)
 */
import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import { useTranslation } from "../i18n/i18n";
import { cn } from "../lib/cn";
import { Button } from "./button";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "./revola";

// ─── Size map ─────────────────────────────────────────────────────────────────

const SIZE_CLASS: Record<ModalSize, string> = {
	sm: "sm:max-w-md",
	md: "sm:max-w-lg",
	lg: "sm:max-w-2xl",
	xl: "sm:max-w-xl",
	"2xl": "sm:max-w-2xl",
	"3xl": "sm:max-w-3xl",
	"4xl": "sm:max-w-4xl",
	"5xl": "sm:max-w-5xl",
	"6xl": "sm:max-w-6xl",
	"7xl": "sm:max-w-7xl",
	full: "sm:max-w-4xl",
};

export type ModalSize =
	| "sm"
	| "md"
	| "lg"
	| "xl"
	| "2xl"
	| "3xl"
	| "4xl"
	| "5xl"
	| "6xl"
	| "7xl"
	| "full";

// ─── ModalShell ───────────────────────────────────────────────────────────────

/** Extra props forwarded directly to ResponsiveDialogContent (e.g. data-testid). */
type ContentExtras = Omit<
	ComponentPropsWithoutRef<typeof ResponsiveDialogContent>,
	"className" | "children"
>;

export interface ModalShellProps extends ContentExtras {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	size?: ModalSize;
	footer?: ReactNode;
	onlyDialog?: boolean;
	/** Render as a right-anchored, edge-flush, full-height slide-over panel. */
	slideOver?: boolean;
	children: ReactNode;
}

export function ModalShell({
	open,
	onOpenChange,
	title,
	description,
	size = "md",
	footer,
	onlyDialog,
	slideOver = false,
	children,
	...contentProps
}: ModalShellProps): ReactNode {
	return (
		<ResponsiveDialog
			open={open}
			onOpenChange={onOpenChange}
			onlyDialog={onlyDialog}
			onlyDrawer={slideOver}
			direction={slideOver ? "right" : "bottom"}
		>
			<ResponsiveDialogContent
				className={cn(
					"flex flex-col p-6",
					slideOver
						? cn(
								"inset-y-0 right-0 h-full w-full rounded-none border-l",
								SIZE_CLASS[size],
							)
						: SIZE_CLASS[size],
				)}
				{...contentProps}
			>
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
					{description && (
						<ResponsiveDialogDescription>{description}</ResponsiveDialogDescription>
					)}
				</ResponsiveDialogHeader>

				<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto scrollbar-none px-1 py-2">
					{children}
				</div>

				{footer && <ResponsiveDialogFooter>{footer}</ResponsiveDialogFooter>}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

export interface ConfirmDialogProps extends ContentExtras {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	body?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	destructive?: boolean;
	onConfirm: () => void;
}

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	body,
	confirmLabel,
	cancelLabel,
	destructive = false,
	onConfirm,
	...contentProps
}: ConfirmDialogProps): ReactNode {
	const t = useTranslation();
	const resolvedConfirm = confirmLabel ?? t("action.confirm");
	const resolvedCancel = cancelLabel ?? t("action.cancel");

	return (
		<ModalShell
			open={open}
			onOpenChange={onOpenChange}
			title={title}
			size="sm"
			onlyDialog
			{...contentProps}
			footer={
				<>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						data-testid="confirm-dialog-cancel"
					>
						{resolvedCancel}
					</Button>
					<Button
						type="button"
						variant={destructive ? "destructive" : "default"}
						onClick={onConfirm}
						data-testid="confirm-dialog-confirm"
					>
						{resolvedConfirm}
					</Button>
				</>
			}
		>
			{body && <p className="text-sm text-muted-foreground">{body}</p>}
		</ModalShell>
	);
}
