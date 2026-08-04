import { cn } from "../lib/cn";
import type { OptionDisplay, StaticOption } from "./selectShared";

/**
 * `list` is the dropdown row; `inline` is the single-select trigger and the
 * multi chip, where the control's height must not depend on option data.
 */
type OptionSurface = "list" | "inline";

interface SelectOptionContentProps {
	option: Pick<StaticOption, "label" | "display">;
	surface?: OptionSurface;
}

// Author markup is written for the dropdown, so the inline surfaces cap its
// height and shrink its images rather than letting it resize the control.
const HTML_BOX: Record<OptionSurface, string> = {
	list: "[&_img]:max-h-10",
	inline: "max-h-5 overflow-hidden [&_img]:max-h-4 [&_*]:!text-inherit",
};

// The trigger's height is fixed (h-9, h-8 compact), so an inline
// preview stays under that inner clearance.
const IMAGE_SIZE: Record<OptionSurface, string> = {
	list: "size-8",
	inline: "size-5",
};

export function SelectOptionContent({ option, surface = "list" }: SelectOptionContentProps) {
	const { label, display } = option;
	if (!display) {
		return <span className="truncate">{label}</span>;
	}
	// Callers keep `label` as the option's text: Radix items take textValue, and
	// the chip/searchable surfaces read option.label directly.
	return (
		<span className="flex min-w-0 items-center gap-2">
			{/* html wins outright — image and subtitle are ignored beside it. */}
			{display.html !== undefined ? (
				<span
					className={cn("min-w-0", HTML_BOX[surface])}
					// biome-ignore lint/security/noDangerouslySetInnerHtml: DSL-authored content, not user input
					dangerouslySetInnerHTML={{ __html: display.html }}
				/>
			) : (
				<RichLabel label={label} display={display} surface={surface} />
			)}
		</span>
	);
}

interface RichLabelProps {
	label: string;
	display: OptionDisplay;
	surface: OptionSurface;
}

function RichLabel({ label, display, surface }: RichLabelProps) {
	// Subtitle only earns a second line in the dropdown; inline it would make
	// the trigger two rows tall.
	const showSubtitle = display.subtitle !== undefined && surface === "list";
	return (
		<>
			{display.image !== undefined && (
				<img
					src={display.image}
					alt=""
					className={cn("shrink-0 rounded object-cover", IMAGE_SIZE[surface])}
				/>
			)}
			<span className="flex min-w-0 flex-col">
				<span className="truncate">{label}</span>
				{showSubtitle && (
					<span className="truncate text-muted-foreground text-xs">
						{display.subtitle}
					</span>
				)}
			</span>
		</>
	);
}
