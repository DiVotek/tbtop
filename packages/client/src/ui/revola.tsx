import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva } from "class-variance-authority";
import { XIcon } from "lucide-react";
import {
	type ComponentProps,
	type ComponentPropsWithoutRef,
	type ComponentRef,
	createContext,
	forwardRef,
	type HTMLAttributes,
	type ReactNode,
	useContext,
	useState,
} from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "../lib/cn";
import { useMediaQuery } from "../lib/useMediaQuery";

const MOBILE_BREAKPOINT = "(min-width: 640px)";

type ResponsiveDialogContextValue = {
	modal: boolean;
	dismissible: boolean;
	direction: "top" | "right" | "bottom" | "left";
	onlyDrawer: boolean;
	onlyDialog: boolean;
	alert: boolean;
	// Resolved once by the root so all children agree on the same mode.
	useDialog: boolean;
};

const ResponsiveDialogContext = createContext<ResponsiveDialogContextValue | null>(null);

function useResponsiveDialog(): ResponsiveDialogContextValue {
	const ctx = useContext(ResponsiveDialogContext);
	if (!ctx) {
		throw new Error("useResponsiveDialog must be used inside <ResponsiveDialog>");
	}
	return ctx;
}

function useShouldUseDialog(): boolean {
	return useResponsiveDialog().useDialog;
}

export type ResponsiveDialogProps = ComponentProps<typeof DrawerPrimitive.Root> & {
	onlyDrawer?: boolean;
	onlyDialog?: boolean;
	alert?: boolean;
};

export function ResponsiveDialog({
	modal = true,
	dismissible = true,
	direction = "bottom",
	onlyDrawer = false,
	onlyDialog = false,
	alert = false,
	shouldScaleBackground = true,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	...props
}: ResponsiveDialogProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const isUncontrolled = controlledOpen === undefined;
	const open = isUncontrolled ? internalOpen : controlledOpen;
	const onOpenChange = isUncontrolled ? setInternalOpen : controlledOnOpenChange;

	const isDesktop = useMediaQuery(MOBILE_BREAKPOINT);

	// Resolve mode exactly once; guard until known so Dialog/Drawer portals are
	// never mounted before their matching root (the "DialogPortal must be used
	// within Dialog" mobile crash when matchMedia fires mid-tree).
	if (!onlyDialog && !onlyDrawer && isDesktop === null) {
		return null;
	}

	const useDialog = onlyDialog || (!onlyDrawer && (isDesktop ?? true));
	const mode = useDialog ? "dialog" : "drawer";
	const Root = useDialog ? DialogPrimitive.Root : DrawerPrimitive.Root;

	const effectiveModal = alert ? true : modal;
	const effectiveDismissible = alert ? true : dismissible;

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
			}}
		>
			{/* key ensures the whole subtree unmounts and remounts atomically when
			    the responsive mode flips, preventing portal/root mismatch errors. */}
			<Root
				key={mode}
				modal={effectiveModal}
				direction={direction}
				dismissible={effectiveDismissible}
				shouldScaleBackground={shouldScaleBackground}
				open={open}
				onOpenChange={onOpenChange}
				{...props}
			/>
		</ResponsiveDialogContext.Provider>
	);
}

export function ResponsiveDialogTrigger(props: ComponentProps<typeof DialogPrimitive.Trigger>) {
	const Trigger = useShouldUseDialog() ? DialogPrimitive.Trigger : DrawerPrimitive.Trigger;
	return <Trigger {...props} />;
}

function ResponsiveDialogPortal(props: ComponentProps<typeof DialogPrimitive.Portal>) {
	const Portal = useShouldUseDialog() ? DialogPrimitive.Portal : DrawerPrimitive.Portal;
	return <Portal {...props} />;
}

function ResponsiveDialogOverlay({
	className,
	...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
	const Overlay = useShouldUseDialog() ? DialogPrimitive.Overlay : DrawerPrimitive.Overlay;
	return (
		<Overlay
			{...props}
			className={cn(
				"fixed inset-0 z-50 bg-black/50 sm:data-[state=open]:animate-in sm:data-[state=closed]:animate-out sm:data-[state=closed]:fade-out-0 sm:data-[state=open]:fade-in-0",
				className,
			)}
		/>
	);
}

export function ResponsiveDialogClose(props: ComponentProps<typeof DialogPrimitive.Close>) {
	const { dismissible, alert } = useResponsiveDialog();
	const Close = useShouldUseDialog() ? DialogPrimitive.Close : DrawerPrimitive.Close;
	const shouldPreventClose = !dismissible && !alert;
	return (
		<Close
			aria-label="Close"
			{...(shouldPreventClose && { onClick: (e: React.MouseEvent) => e.preventDefault() })}
			{...props}
		/>
	);
}

const responsiveDialogContentVariants = cva("fixed z-[9999] bg-background", {
	variants: {
		device: {
			desktop:
				"left-1/2 top-1/2 grid max-h-[calc(100%-4rem)] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:max-w-lg",
			mobile: "flex",
		},
		direction: {
			bottom: "",
			top: "",
			left: "",
			right: "",
		},
	},
	defaultVariants: {
		device: "desktop",
		direction: "bottom",
	},
	compoundVariants: [
		{
			device: "mobile",
			direction: "bottom",
			className:
				"inset-x-0 bottom-0 mt-24 h-fit max-h-[65%] flex-col rounded-t-[10px] border border-b-0 border-primary/10",
		},
		{
			device: "mobile",
			direction: "top",
			className:
				"inset-x-0 top-0 mb-24 h-fit max-h-[65%] flex-col rounded-b-[10px] border border-b-0 border-primary/10",
		},
		{
			device: "mobile",
			direction: "left",
			className:
				"bottom-2 left-2 top-2 flex w-[310px] bg-transparent outline-none [--initial-transform:calc(100%+8px)]",
		},
		{
			device: "mobile",
			direction: "right",
			className:
				"bottom-2 right-2 top-2 w-[310px] bg-transparent outline-none [--initial-transform:calc(100%+8px)]",
		},
	],
});

type DismissFlags = { useDialog: boolean; preventEscape: boolean; preventOutside: boolean };

// Dialog and drawer name the outside-press event differently; escape only
// applies to the dialog. Returns the matching Radix handler props.
function dismissHandlers(flags: DismissFlags): Record<string, (e: Event) => void> {
	const block = (e: Event) => e.preventDefault();
	const out: Record<string, (e: Event) => void> = {};
	if (flags.useDialog) {
		if (flags.preventEscape) {
			out.onEscapeKeyDown = block;
		}
		if (flags.preventOutside) {
			out.onInteractOutside = block;
		}
		return out;
	}
	if (flags.preventOutside) {
		out.onPointerDownOutside = block;
		out.onInteractOutside = block;
	}
	return out;
}

export const ResponsiveDialogContent = forwardRef<
	HTMLDivElement,
	ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
		showCloseButton?: boolean;
		closeButtonClassName?: string;
		dragHandleClassName?: string;
	}
>(
	(
		{
			className,
			children,
			showCloseButton = true,
			closeButtonClassName,
			dragHandleClassName,
			...props
		},
		ref,
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: vendored revola adapter; residual complexity is render-conditional JSX
	) => {
		const { direction, modal, dismissible, alert } = useResponsiveDialog();
		const shouldUseDialog = useShouldUseDialog();
		const Content = shouldUseDialog ? DialogPrimitive.Content : DrawerPrimitive.Content;

		const shouldShowCloseButton = !alert && showCloseButton;
		const shouldPreventOutsideInteraction = !modal || (!dismissible && !alert) || alert;

		return (
			<ResponsiveDialogPortal>
				<ResponsiveDialogOverlay />
				<Content
					ref={ref}
					{...props}
					{...dismissHandlers({
						useDialog: shouldUseDialog,
						preventEscape: !dismissible && !alert,
						preventOutside: shouldPreventOutsideInteraction,
					})}
					className={cn(
						responsiveDialogContentVariants({
							device: shouldUseDialog ? "desktop" : "mobile",
							direction,
						}),
						className,
					)}
				>
					{!shouldUseDialog && direction === "bottom" && (
						<div
							className={cn(
								"mx-auto my-4 h-1.5 w-14 rounded-full bg-muted-foreground/25 pb-1.5 dark:bg-muted",
								dragHandleClassName,
							)}
						/>
					)}
					{children}
					{shouldShowCloseButton && (
						<ResponsiveDialogClose
							className={cn(
								"absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background backdrop-blur-sm transition-opacity hover:opacity-100 focus:outline-none focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none",
								closeButtonClassName,
							)}
						>
							<XIcon className="size-4" />
							<span className="sr-only">close</span>
						</ResponsiveDialogClose>
					)}
				</Content>
			</ResponsiveDialogPortal>
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

export const ResponsiveDialogTitle = forwardRef<
	ComponentRef<typeof DialogPrimitive.Title>,
	ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => {
	const Title = useShouldUseDialog() ? DialogPrimitive.Title : DrawerPrimitive.Title;
	return (
		<Title
			ref={ref}
			className={cn("text-lg font-semibold leading-none tracking-tight", className)}
			{...props}
		/>
	);
});
ResponsiveDialogTitle.displayName = "ResponsiveDialogTitle";

export const ResponsiveDialogDescription = forwardRef<
	ComponentRef<typeof DialogPrimitive.Description>,
	ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => {
	const Description = useShouldUseDialog()
		? DialogPrimitive.Description
		: DrawerPrimitive.Description;
	return (
		<Description
			ref={ref}
			className={cn("text-sm text-muted-foreground", className)}
			{...props}
		/>
	);
});
ResponsiveDialogDescription.displayName = "ResponsiveDialogDescription";
