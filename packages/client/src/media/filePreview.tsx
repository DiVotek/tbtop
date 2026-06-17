/**
 * FilePreview — extensible preview seam for a MediaItem. A registry lets
 * consumers register richer previews (PDF, markdown, text viewers) keyed by a
 * predicate; the FIRST matching registration wins. With nothing matched, the
 * default renders <MediaThumb> (image inline / typed icon) plus Open + Download.
 */
import type { ComponentType, ReactNode } from "react";
import { toast } from "sonner";
import { useApiBase } from "../data/client";
import { useTranslation } from "../i18n/i18n";
import { cn } from "../lib/cn";
import { buttonVariants } from "../ui/button";
import { MediaThumb } from "./mediaThumb";
import type { MediaItem } from "./types";

// ─── Registry ───────────────────────────────────────────────────────────────

export type FilePreviewPredicate = (item: MediaItem) => boolean;
export type FilePreviewRenderer = ComponentType<{ item: MediaItem }>;

interface FilePreviewEntry {
	predicate: FilePreviewPredicate;
	renderer: FilePreviewRenderer;
}

const registry: FilePreviewEntry[] = [];

export function registerFilePreview(
	predicate: FilePreviewPredicate,
	renderer: FilePreviewRenderer,
): void {
	registry.push({ predicate, renderer });
}

export function clearFilePreviewRegistry(): void {
	registry.length = 0;
}

function resolveRenderer(item: MediaItem): FilePreviewRenderer | undefined {
	return registry.find((entry) => entry.predicate(item))?.renderer;
}

// ─── FilePreview ──────────────────────────────────────────────────────────────

export function FilePreview({ item }: { item: MediaItem }): ReactNode {
	const Registered = resolveRenderer(item);
	if (Registered) {
		return <Registered item={item} />;
	}
	return <DefaultPreview item={item} />;
}

// ─── DefaultPreview ───────────────────────────────────────────────────────────
// MediaThumb visual (image inline / typed icon) + Open + Download controls.

function DefaultPreview({ item }: { item: MediaItem }): ReactNode {
	const t = useTranslation();
	const apiBase = useApiBase();
	const downloadHref = `${apiBase}/media/${item.id}/download`;
	const anchorClass = cn(buttonVariants({ variant: "outline", size: "sm" }));

	return (
		<div className="flex flex-col items-center gap-3">
			<MediaThumb
				item={item}
				size="lg"
				imgTestId="detail-preview-img"
				iconTestId="detail-preview-icon"
			/>
			<div className="flex gap-2">
				<a
					href={item.url}
					target="_blank"
					rel="noopener noreferrer"
					className={anchorClass}
					data-testid="file-preview-open"
				>
					{t("media.preview.open")}
				</a>
				<a
					href={downloadHref}
					download
					className={anchorClass}
					onClick={() => toast(t("media.preview.download_started"))}
					data-testid="file-preview-download"
				>
					{t("media.preview.download")}
				</a>
			</div>
		</div>
	);
}
