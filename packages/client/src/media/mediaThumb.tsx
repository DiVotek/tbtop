/**
 * MediaThumb — shared file visual: image thumbnail for images, otherwise a
 * typed icon (color-coded by kind) with a small extension badge. Owns only the
 * inner visual; callers keep their own card/chip wrappers.
 */
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Badge } from "../ui/badge";
import { fileKindOf } from "./fileType";
import type { MediaItem } from "./types";
import { isImageMime } from "./useMediaApi";

type ThumbSize = "sm" | "md" | "lg";

interface MediaThumbProps {
	item: MediaItem;
	size?: ThumbSize;
	className?: string;
	/** testid for the rendered <img> (image items). */
	imgTestId?: string;
	/** testid for the rendered icon (non-image items). */
	iconTestId?: string;
}

const CONTAINER_SIZE: Record<ThumbSize, string> = {
	sm: "h-10 w-10",
	md: "h-full w-full",
	lg: "max-h-48 max-w-full",
};

const ICON_SIZE: Record<ThumbSize, string> = {
	sm: "h-5 w-5",
	md: "h-8 w-8",
	lg: "h-16 w-16",
};

export function MediaThumb({
	item,
	size = "md",
	className,
	imgTestId,
	iconTestId,
}: MediaThumbProps): ReactNode {
	if (isImageMime(item.mime)) {
		return (
			<img
				src={item.sizes.profile ?? item.url}
				alt={item.alt ?? item.name}
				className={cn(
					CONTAINER_SIZE[size],
					size === "lg" ? "rounded object-contain" : "rounded object-cover",
					className,
				)}
				data-testid={imgTestId}
			/>
		);
	}

	const { Icon, colorClass, ext } = fileKindOf(item.mime, item.name);
	return (
		<div className={cn("relative flex items-center justify-center", className)}>
			<Icon className={cn(ICON_SIZE[size], colorClass)} data-testid={iconTestId} />
			<Badge
				variant="secondary"
				className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-0 text-[9px] leading-none"
			>
				{ext}
			</Badge>
		</div>
	);
}
