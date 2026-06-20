import type { RenderProps } from "../render/blockRegistry";
import { defineBlock } from "../render/defineBlock";

interface DisplayKeyValueOptions {
	entries: Record<string, unknown>;
}

export function DisplayKeyValueBlock({ options }: RenderProps<DisplayKeyValueOptions>) {
	const pairs = Object.entries(options.entries ?? {});
	return (
		<dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
			{pairs.map(([key, value]) => (
				<div key={key} className="contents">
					<dt className="font-medium text-muted-foreground">{key}</dt>
					<dd>{value == null ? "" : String(value)}</dd>
				</div>
			))}
		</dl>
	);
}

export const displayKeyValueBlockDescriptor = defineBlock<
	"displayKeyValue",
	DisplayKeyValueOptions
>("displayKeyValue", { behavior: "leaf", render: DisplayKeyValueBlock });
