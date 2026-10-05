import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog } from "@base-ui/react/dialog";
import { Drawer } from "@base-ui/react/drawer";
import { XIcon } from "lucide-react";
import {
	type ComponentPropsWithoutRef,
	createContext,
	forwardRef,
	type HTMLAttributes,
	isValidElement,
	type MutableRefObject,
	type ReactElement,
	type ReactNode,
	useContext,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useTranslation } from "../i18n/i18n";
import { cn } from "../lib/cn";
import { useMediaQuery } from "../lib/useMediaQuery";
import { type ContentDismissHooks, isCloseBlocked, runAutoFocusHook } from "./revolaDismiss";
import {
	dialogOverlayClass,
	drawerOverlayClass,
	responsiveDialogContentVariants,
} from "./revolaStyles";

const MOBILE_BREAKPOINT = "(min-width: 640px)";

type Direction = "top" | "right" | "bottom" | "left";

const SWIPE_DIRECTION = { top: "up", right: "right", bottom: "down", left: "left" } as const;

type ResponsiveDialogContextValue = {
	modal: boolean;
	dismissible: boolean;
	direction: Direction;
	onlyDrawer: boolean;
	onlyDialog: boolean;
	alert: boolean;
	// Resolved once by the root so all children agree on the same mode.
	useDialog: boolean;
	// Content registers its Radix-shaped hooks here; the root's close gate reads them.
	dismissHooks: MutableRefObject<ContentDismissHooks>;
};

const ResponsiveDialogContext = createContext<ResponsiveDialogContextValue | null>(null);

function useResponsiveDialog(): ResponsiveDialogContextValue {
	const ctx = useContext(ResponsiveDialogContext);
	if (!ctx) {
		throw new Error("useResponsiveDialog must be used inside <ResponsiveDialog>");
	}
	return ctx;
}

export type ResponsiveDialogProps = {
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	modal?: boolean;
	dismissible?: boolean;
	direction?: Direction;
	/** Accepted for compatibility with the former vaul drawer; it has no effect. */
	shouldScaleBackground?: boolean;
	onlyDrawer?: boolean;
	onlyDialog?: boolean;
	alert?: boolean;
	children?: ReactNode;
};

export function ResponsiveDialog({
	modal = true,
	dismissible = true,
	direction = "bottom",
	onlyDrawer = false,
	onlyDialog = false,
	alert = false,
	open: controlledOpen,
	defaultOpen = false,
	onOpenChange: controlledOnOpenChange,
	children,
}: ResponsiveDialogProps) {
	const [internalOpen, setInternalOpen] = useState(defaultOpen);
	const dismissHooks = useRef<ContentDismissHooks>({});
	const isUncontrolled = controlledOpen === undefined;
	const open = isUncontrolled ? internalOpen : controlledOpen;
	const onOpenChange = isUncontrolled ? setInternalOpen : controlledOnOpenChange;

	const isDesktop = useMediaQuery(MOBILE_BREAKPOINT);

	// Resolve mode exactly once; guard until known so Dialog/Drawer parts are
	// never mounted before their matching root when matchMedia fires mid-tree.
	if (!onlyDialog && !onlyDrawer && isDesktop === null) {
		return null;
	}

	const useDialog = onlyDialog || (!onlyDrawer && (isDesktop ?? true));
	const effectiveModal = alert ? true : modal;
	const effectiveDismissible = alert ? true : dismissible;
	const rules = {
		dismissible: effectiveDismissible,
		preventOutside: !effectiveModal || !effectiveDismissible || alert,
	};

	function handleOpenChange(
		next: boolean,
		details: { reason: string; event: Event; cancel: () => void },
	): void {
		if (!next && isCloseBlocked(details, rules, dismissHooks.current)) {
			details.cancel();
			return;
		}
		onOpenChange?.(next);
	}

	const rootProps = { open, onOpenChange: handleOpenChange, children };
	const dialogProps = { modal: effectiveModal, disablePointerDismissal: rules.preventOutside };

	// key remounts the subtree atomically when the responsive mode flips, so
	// parts never meet a root of the other engine.
	function renderRoot(): ReactNode {
		if (!useDialog) {
			return (
				<Drawer.Root
					key="drawer"
					{...rootProps}
					{...dialogProps}
					swipeDirection={SWIPE_DIRECTION[direction]}
				/>
			);
		}
		if (alert) {
			return <AlertDialog.Root key="alert" {...rootProps} />;
		}
		return <Dialog.Root key="dialog" {...rootProps} {...dialogProps} />;
	}

	return (
		<ResponsiveDialogContext.Provider
			value={{
				modal: effectiveModal,
				dismissible: effectiveDismissible,
				direction,
				onlyDrawer,
				onlyDialog,
				alert,
				useDialog,
				dismissHooks,
			}}
		>
			{renderRoot()}
		</ResponsiveDialogContext.Provider>
	);
}

type ButtonPartProps = ComponentPropsWithoutRef<"button"> & { asChild?: boolean };

// Radix's `asChild` maps onto Base UI's `render` element.
function renderAsChild(asChild: boolean | undefined, children: ReactNode) {
	return asChild && isValidElement(children)
		? { render: children as ReactElement<Record<string, unknown>> }
		: { children };
}

export function ResponsiveDialogTrigger({ asChild, children, ...props }: ButtonPartProps) {
	const { useDialog, alert } = useResponsiveDialog();
	const part = renderAsChild(asChild, children);
	if (!useDialog) {
		return <Drawer.Trigger {...props} {...part} />;
	}
	const Trigger = alert ? AlertDialog.Trigger : Dialog.Trigger;
	return <Trigger {...props} {...part} />;
}

export function ResponsiveDialogClose({ asChild, children, ...props }: ButtonPartProps) {
	const { useDialog } = useResponsiveDialog();
	const t = useTranslation();
	const Close = useDialog ? Dialog.Close : Drawer.Close;
	return (
		<Close aria-label={t("action.close")} {...props} {...renderAsChild(asChild, children)} />
	);
}

export type ResponsiveDialogContentProps = ComponentPropsWithoutRef<"div"> &
	ContentDismissHooks & {
		showCloseButton?: boolean;
		closeButtonClassName?: string;
		dragHandleClassName?: string;
		onOpenAutoFocus?: (event: Event) => void;
		onCloseAutoFocus?: (event: Event) => void;
	};

export const ResponsiveDialogContent = forwardRef<HTMLDivElement, ResponsiveDialogContentProps>(
	(
		{
			className,
			children,
			showCloseButton = true,
			closeButtonClassName,
			dragHandleClassName,
			onOpenAutoFocus,
			onCloseAutoFocus,
			onEscapeKeyDown,
			onPointerDownOutside,
			onInteractOutside,
			...props
		},
		ref,
	) => {
		const { direction, alert, useDialog, dismissHooks } = useResponsiveDialog();
		const t = useTranslation();

		useLayoutEffect(() => {
			dismissHooks.current = { onEscapeKeyDown, onPointerDownOutside, onInteractOutside };
		});

		const Portal = useDialog ? Dialog.Portal : Drawer.Portal;
		const Backdrop = useDialog ? Dialog.Backdrop : Drawer.Backdrop;
		const Popup = useDialog ? Dialog.Popup : Drawer.Popup;
		const popup = (
			<Popup
				ref={ref}
				{...props}
				initialFocus={onOpenAutoFocus && (() => runAutoFocusHook(onOpenAutoFocus))}
				finalFocus={onCloseAutoFocus && (() => runAutoFocusHook(onCloseAutoFocus))}
				className={cn(
					responsiveDialogContentVariants({
						device: useDialog ? "desktop" : "mobile",
						direction,
					}),
					className,
				)}
			>
				{!useDialog && direction === "bottom" && (
					<div
						className={cn(
							"mx-auto my-4 h-1.5 w-14 rounded-full bg-muted-foreground/25 pb-1.5 dark:bg-muted",
							dragHandleClassName,
						)}
					/>
				)}
				{children}
				{!alert && showCloseButton && (
					<ResponsiveDialogClose
						className={cn(
							"absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background backdrop-blur-sm transition-opacity hover:opacity-100 focus:outline-none focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none",
							closeButtonClassName,
						)}
					>
						<XIcon className="size-4" />
						<span className="sr-only">{t("action.close")}</span>
					</ResponsiveDialogClose>
				)}
			</Popup>
		);

		return (
			<Portal>
				<Backdrop className={useDialog ? dialogOverlayClass : drawerOverlayClass} />
				{/* The drawer's swipe handling and touch scroll lock live on its viewport. */}
				{useDialog ? popup : <Drawer.Viewport>{popup}</Drawer.Viewport>}
			</Portal>
		);
	},
);
ResponsiveDialogContent.displayName = "ResponsiveDialogContent";

export function ResponsiveDialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn("flex flex-col gap-1.5 text-center sm:text-left", className)}
			{...props}
		/>
	);
}

export function ResponsiveDialogFooter({
	className,
	children,
}: {
	className?: string;
	children?: ReactNode;
}) {
	return (
		<footer className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}>
			{children}
		</footer>
	);
}

export const ResponsiveDialogTitle = forwardRef<HTMLHeadingElement, ComponentPropsWithoutRef<"h2">>(
	({ className, ...props }, ref) => {
		const Title = useResponsiveDialog().useDialog ? Dialog.Title : Drawer.Title;
		return (
			<Title
				ref={ref}
				className={cn("text-lg font-semibold leading-none tracking-tight", className)}
				{...props}
			/>
		);
	},
);
ResponsiveDialogTitle.displayName = "ResponsiveDialogTitle";

export const ResponsiveDialogDescription = forwardRef<
	HTMLParagraphElement,
	ComponentPropsWithoutRef<"p">
>(({ className, ...props }, ref) => {
	const Description = useResponsiveDialog().useDialog ? Dialog.Description : Drawer.Description;
	return (
		<Description
			ref={ref}
			className={cn("text-sm text-muted-foreground", className)}
			{...props}
		/>
	);
});
ResponsiveDialogDescription.displayName = "ResponsiveDialogDescription";
