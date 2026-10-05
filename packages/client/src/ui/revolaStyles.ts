import { cva } from "class-variance-authority";

export const dialogOverlayClass =
	"fixed inset-0 z-50 bg-black/50 sm:data-open:animate-in sm:data-closed:animate-out sm:data-closed:fade-out-0 sm:data-open:fade-in-0";

// Base UI drives the drawer by CSS: it exposes the live drag offset and the
// enter/exit states, the transform itself is ours. Easing matches vaul's.
const drawerMotion =
	"transition-[translate,opacity] duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:duration-0 motion-reduce:transition-none";

export const drawerOverlayClass = `fixed inset-0 z-50 bg-black/50 opacity-[calc(1-var(--drawer-swipe-progress,0))] data-starting-style:opacity-0 data-ending-style:opacity-0 ${drawerMotion}`;

// z-50 is the shared floating layer. A higher value buries the select and
// dropdown popovers (also z-50) opened from inside the dialog.
export const responsiveDialogContentVariants = cva("fixed z-50 bg-background", {
	variants: {
		device: {
			desktop:
				"left-1/2 top-1/2 grid max-h-[calc(100%-4rem)] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] origin-center gap-4 rounded-lg border shadow-lg data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-[98%] data-open:zoom-in-[97%] data-open:duration-[180ms] data-closed:duration-150 data-open:ease-out data-closed:ease-in motion-reduce:animate-none sm:max-w-lg",
			mobile: `flex data-swiping:select-none data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*400ms)] ${drawerMotion}`,
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
				"inset-x-0 bottom-0 mt-24 h-fit max-h-[65%] flex-col rounded-t-md border border-b-0 border-primary/10 translate-y-[var(--drawer-swipe-movement-y,0px)] data-starting-style:translate-y-full data-ending-style:translate-y-full",
		},
		{
			device: "mobile",
			direction: "top",
			className:
				"inset-x-0 top-0 mb-24 h-fit max-h-[65%] flex-col rounded-b-md border border-b-0 border-primary/10 translate-y-[var(--drawer-swipe-movement-y,0px)] data-starting-style:-translate-y-full data-ending-style:-translate-y-full",
		},
		{
			device: "mobile",
			direction: "left",
			className:
				"bottom-2 left-2 top-2 w-[310px] bg-background outline-none translate-x-[var(--drawer-swipe-movement-x,0px)] data-starting-style:translate-x-[calc(-100%-8px)] data-ending-style:translate-x-[calc(-100%-8px)]",
		},
		{
			device: "mobile",
			direction: "right",
			className:
				"bottom-2 right-2 top-2 w-[310px] bg-background outline-none translate-x-[var(--drawer-swipe-movement-x,0px)] data-starting-style:translate-x-[calc(100%+8px)] data-ending-style:translate-x-[calc(100%+8px)]",
		},
	],
});
