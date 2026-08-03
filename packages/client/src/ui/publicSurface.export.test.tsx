// The documented public UI surface: every primitive below must stay reachable
// from the package entry barrel, which is what a consumer actually imports.
// Importing via relative source path would pass even if an export line were
// dropped from index.ts.
import { expect, test } from "bun:test";
import { render } from "@testing-library/react";
import * as pkg from "..";

const uiExports: string[] = [
	"Alert",
	"AlertDescription",
	"AlertTitle",
	"Badge",
	"badgeVariants",
	"Button",
	"buttonVariants",
	"Card",
	"CardAction",
	"CardContent",
	"CardDescription",
	"CardFooter",
	"CardHeader",
	"CardTitle",
	"Checkbox",
	"ConfirmDialog",
	"CopyButton",
	"DropdownMenu",
	"DropdownMenuCheckboxItem",
	"DropdownMenuContent",
	"DropdownMenuGroup",
	"DropdownMenuItem",
	"DropdownMenuLabel",
	"DropdownMenuPortal",
	"DropdownMenuRadioGroup",
	"DropdownMenuRadioItem",
	"DropdownMenuSeparator",
	"DropdownMenuSub",
	"DropdownMenuSubContent",
	"DropdownMenuSubTrigger",
	"DropdownMenuTrigger",
	"Input",
	"inputCompactFontClass",
	"inputFontClass",
	"inputTextClass",
	"InputOTP",
	"InputOTPGroup",
	"InputOTPSeparator",
	"InputOTPSlot",
	"Label",
	"ModalShell",
	"NodeIcon",
	"Popover",
	"PopoverAnchor",
	"PopoverContent",
	"PopoverDescription",
	"PopoverHeader",
	"PopoverTitle",
	"PopoverTrigger",
	"Progress",
	"RadioGroup",
	"RadioGroupItem",
	"ReloadOverlay",
	"ResponsiveDialog",
	"ResponsiveDialogClose",
	"ResponsiveDialogContent",
	"ResponsiveDialogDescription",
	"ResponsiveDialogFooter",
	"ResponsiveDialogHeader",
	"ResponsiveDialogTitle",
	"ResponsiveDialogTrigger",
	"Select",
	"SelectContent",
	"SelectGroup",
	"SelectItem",
	"SelectLabel",
	"SelectScrollDownButton",
	"SelectScrollUpButton",
	"SelectSeparator",
	"SelectTrigger",
	"SelectValue",
	"Slider",
	"Spinner",
	"StatBlock",
	"StatCard",
	"Switch",
	"Tabs",
	"TabsContent",
	"TabsList",
	"TabsTrigger",
	"tabsListVariants",
	"Textarea",
	"ToggleGroup",
	"ToggleGroupItem",
	"Tooltip",
	"TooltipContent",
	"TooltipProvider",
	"TooltipTrigger",
	// Richtext ships only as lazy wrappers so Lexical stays out of the static graph.
	"RichtextViewLazy",
	"RichtextFormLazy",
];

test.each(uiExports)("%s is reachable from the package entry", (name) => {
	expect(pkg[name as keyof typeof pkg]).toBeDefined();
});

test("the eager Lexical components are not on the public surface", () => {
	expect(pkg).not.toHaveProperty("RichtextView");
	expect(pkg).not.toHaveProperty("RichtextEditor");
	expect(pkg).not.toHaveProperty("RichtextForm");
});

test("cva factories exported from the entry produce class strings", () => {
	expect(typeof pkg.buttonVariants({ variant: "outline" })).toBe("string");
	expect(typeof pkg.badgeVariants({ variant: "secondary" })).toBe("string");
	expect(typeof pkg.tabsListVariants({})).toBe("string");
});

test("primitives imported from the entry render", () => {
	const { container } = render(
		<div>
			<pkg.Badge>New</pkg.Badge>
			<pkg.Button>Save</pkg.Button>
			<pkg.Label htmlFor="x">Name</pkg.Label>
			<pkg.Textarea defaultValue="hi" />
			<pkg.Progress value={40} />
		</div>,
	);
	expect(container.textContent).toContain("New");
	expect(container.textContent).toContain("Save");
	expect(container.textContent).toContain("Name");
	expect(container.querySelector("textarea")?.value).toBe("hi");
});
