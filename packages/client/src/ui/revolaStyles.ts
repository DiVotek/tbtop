import { cva } from "class-variance-authority";

// New-gen shape: visuals come from the `cn-dialog-*` / `cn-drawer-*` rules in
// `ui/presets/style-preset-*.css`; this file keeps only what the presets do not
// own. Mapping:
//   dialog backdrop → `cn-dialog-overlay` (+ fixed/inset/z-50)
//   drawer backdrop → `cn-drawer-overlay` (+ fixed/inset/z-50 and our swipe fade)
//   desktop popup   → `cn-dialog-content` (+ fixed centering, max-h, w-full)
//   drawer popup    → `cn-drawer-popup` (+ edge positioning and swipe transforms)
// The engine is Base UI, which emits `data-open` / `data-closed` natively, so
// the preset's open/close animations apply without a `data-state` duplicate.
// `cn-drawer-content` is not used: in vega/nova it keys off vaul's
// `data-vaul-drawer-direction`, which Base UI's drawer never emits.
// Deltas vs upstream: `sm:max-w-lg` default width (callers such as the command
// palette and ModalShell's `md` size rely on it), `origin-center` and
// `motion-reduce:animate-none` on the dialog, and the vaul-style drawer motion.
// The preset layer sits below utilities, so a caller's `sm:max-w-*` or padding
// beats the preset's, and tailwind-merge dedupes it against this default.

export const dialogOverlayClass = "cn-dialog-overlay fixed inset-0 z-50";

// Base UI drives the drawer by CSS: it exposes the live drag offset and the
// enter/exit states, the transform itself is ours. Easing matches vaul's.
const drawerMotion =
	"transition-[translate,opacity] duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:duration-0 motion-reduce:transition-none";

export const drawerOverlayClass = `cn-drawer-overlay fixed inset-0 z-50 opacity-[calc(1-var(--drawer-swipe-progress,0))] data-starting-style:opacity-0 data-ending-style:opacity-0 ${drawerMotion}`;

// z-50 is the shared floating layer. A higher value buries the select and
// dropdown popovers (also z-50) opened from inside the dialog.
export const responsiveDialogContentVariants = cva("fixed z-50", {
	variants: {
		device: {
			desktop:
				"cn-dialog-content left-1/2 top-1/2 max-h-[calc(100%-4rem)] w-full translate-x-[-50%] translate-y-[-50%] origin-center outline-none motion-reduce:animate-none sm:max-w-lg",
			mobile: `cn-drawer-popup group/drawer-popup flex data-swiping:select-none data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*400ms)] ${drawerMotion}`,
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
				"inset-x-0 bottom-0 mt-24 h-fit max-h-[65%] flex-col translate-y-[var(--drawer-swipe-movement-y,0px)] data-starting-style:translate-y-full data-ending-style:translate-y-full",
		},
		{
			device: "mobile",
			direction: "top",
			className:
				"inset-x-0 top-0 mb-24 h-fit max-h-[65%] flex-col translate-y-[var(--drawer-swipe-movement-y,0px)] data-starting-style:-translate-y-full data-ending-style:-translate-y-full",
		},
		{
			device: "mobile",
			direction: "left",
			className:
				"bottom-2 left-2 top-2 w-[310px] outline-none translate-x-[var(--drawer-swipe-movement-x,0px)] data-starting-style:translate-x-[calc(-100%-8px)] data-ending-style:translate-x-[calc(-100%-8px)]",
		},
		{
			device: "mobile",
			direction: "right",
			className:
				"bottom-2 right-2 top-2 w-[310px] outline-none translate-x-[var(--drawer-swipe-movement-x,0px)] data-starting-style:translate-x-[calc(100%+8px)] data-ending-style:translate-x-[calc(100%+8px)]",
		},
	],
});
