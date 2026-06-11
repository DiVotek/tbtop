import type { RenderProps } from "../render/blockRegistry";
import { defineBlock } from "../render/defineBlock";
import { Alert, AlertDescription, AlertTitle, type AlertVariant } from "../ui/alert";

interface DisplayAlertOptions {
	message: string;
	title?: string;
	color?: string;
}

// Static set — Tailwind emits only classes it sees verbatim in source.
const SUPPORTED_VARIANTS = new Set<string>([
	"info",
	"success",
	"warning",
	"danger",
	"gray",
	"primary",
]);

function toVariant(color: string | undefined): AlertVariant {
	if (color && SUPPORTED_VARIANTS.has(color)) {
		return color as AlertVariant;
	}
	return "info";
}

export function DisplayAlertBlock({ options }: RenderProps<DisplayAlertOptions>) {
	const variant = toVariant(options.color);
	return (
		<Alert variant={variant} data-testid="display-alert-block">
			{options.title && <AlertTitle>{options.title}</AlertTitle>}
			<AlertDescription>{options.message}</AlertDescription>
		</Alert>
	);
}

export const displayAlertBlockDescriptor = defineBlock<"displayAlert", DisplayAlertOptions>(
	"displayAlert",
	{ behavior: "leaf", render: DisplayAlertBlock },
);
