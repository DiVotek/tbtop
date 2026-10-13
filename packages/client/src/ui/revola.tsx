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
import { buttonVariants } from "./button";
import { type ContentDismissHooks, isCloseBlocked, runAutoFocusHook } from "./revolaDismiss";
import {
	dialogOverlayClass,
	drawerOverlayClass,
	responsiveDialogContentVariants,
} from "./revolaStyles";

// New-gen shape: popup/backdrop classes live in `revolaStyles.ts`; the parts
// below emit the structural `cn-dialog-*` names and the preset owns their
// visuals (close position, header/footer gap, title/description type).
// Mapping: close → `cn-dialog-close` on a ghost `icon-sm` button (as upstream),
// header → `cn-dialog-header`, footer → `cn-dialog-footer`, title →
// `cn-dialog-title`, description → `cn-dialog-description`, drawer drag handle
// → `cn-drawer-swipe-handle` (its rules key off `group/drawer-popup` +
// `data-swipe-axis`, which Base UI does not emit, so the popup sets it).
// The drawer reuses the dialog part classes rather than `cn-drawer-header` /
// `-footer` / `-title` / `-description`: one part tree serves both modes.
// Deltas vs upstream: header stays `text-center sm:text-left`, footer stacks
// reversed on mobile, and the handle only renders for bottom drawers.
const MOBILE_BREAKPOINT = "(min-width: 640px)";

type Direction = "top" | "right" | "bottom" | "left";

const SWIPE_DIRECTION = { top: "up", right: "right", bottom: "down", left: "left" } as const;

const SWIPE_AXIS = { top: "y", right: "x", bottom: "y", left: "x" } as const;

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
				data-slot={useDialog ? "dialog-content" : "drawer-content"}
				data-swipe-axis={useDialog ? undefined : SWIPE_AXIS[direction]}
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
						data-slot="drawer-swipe-handle"
						className={cn("cn-drawer-swipe-handle flex shrink-0", dragHandleClassName)}
					/>
				)}
				{children}
				{!alert && showCloseButton && (
					<ResponsiveDialogClose
						data-slot="dialog-close"
						className={cn(
							buttonVariants({ variant: "ghost", size: "icon-sm" }),
							"cn-dialog-close",
							closeButtonClassName,
						)}
					>
						<XIcon />
						<span className="sr-only">{t("action.close")}</span>
					</ResponsiveDialogClose>
				)}
			</Popup>
		);

		return (
			<Portal>
				<Backdrop
					data-slot={useDialog ? "dialog-overlay" : "drawer-overlay"}
					className={useDialog ? dialogOverlayClass : drawerOverlayClass}
				/>
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
			data-slot="dialog-header"
			className={cn("cn-dialog-header flex flex-col text-center sm:text-left", className)}
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
		<footer
			data-slot="dialog-footer"
			className={cn(
				"cn-dialog-footer flex flex-col-reverse sm:flex-row sm:justify-end",
				className,
			)}
		>
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
				data-slot="dialog-title"
				className={cn("cn-dialog-title", className)}
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
			data-slot="dialog-description"
			className={cn("cn-dialog-description", className)}
			{...props}
		/>
	);
});
ResponsiveDialogDescription.displayName = "ResponsiveDialogDescription";
