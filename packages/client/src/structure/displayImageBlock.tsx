import { cn } from "../lib/cn";
import type { RenderProps } from "../render/blockRegistry";
import { defineBlock } from "../render/defineBlock";
import { imageShapeClass } from "./imageShape";

interface DisplayImageOptions {
	src: string;
	alt?: string;
	caption?: string;
	asLink?: boolean;
	shape?: "square" | "circular";
}

// File mode: a download anchor. The author already holds the URL — no
// signed-URL resolution here (that's the upload field's job).
function FileLink({ src, caption }: { src: string; caption?: string }) {
	return (
		<a href={src} download className="text-sm text-primary underline">
			{caption ?? src}
		</a>
	);
}

export function DisplayImageBlock({ options }: RenderProps<DisplayImageOptions>) {
	if (options.asLink) {
		return <FileLink src={options.src} caption={options.caption} />;
	}
	return (
		<figure>
			<img
				src={options.src}
				alt={options.alt ?? ""}
				className={cn("max-w-full", imageShapeClass(options.shape))}
			/>
			{options.caption && (
				<figcaption className="mt-1 text-xs text-muted-foreground">
					{options.caption}
				</figcaption>
			)}
		</figure>
	);
}

export const displayImageBlockDescriptor = defineBlock<"displayImage", DisplayImageOptions>(
	"displayImage",
	{ behavior: "leaf", render: DisplayImageBlock },
);
