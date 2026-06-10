/**
 * MediaGrid — thumbnail grid with search, pagination, drag-and-drop upload,
 * keep-previous-data overlay, and empty state.
 */
import { FileIcon, Loader2Icon, UploadIcon } from "lucide-react";
import { type DragEvent, type ReactNode, useCallback, useRef, useState } from "react";
import { useClient } from "../data/client";
import { useTranslation } from "../i18n/i18n";
import { cn } from "../lib/cn";
import { TablePagination } from "../structure/table/pagination";
import type { TablePaginationOptions } from "../structure/types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import type { MediaItem } from "./types";
import type { MediaQueryParams, MediaQueryState } from "./useMediaApi";
import { formatBytes, isImageMime, uploadMediaItem } from "./useMediaApi";

interface MediaGridProps {
	state: MediaQueryState;
	params: MediaQueryParams;
	onChangeParams: (patch: Partial<MediaQueryParams>) => void;
	onSelect: (item: MediaItem) => void;
	onUploaded: (item: MediaItem) => void;
	folderId: string | null;
	onOpenImportUrl: () => void;
	/** Optional: ids of items to render with a selected-state highlight (picker mode). */
	selectedIds?: string[];
}

const PAGINATION_OPTIONS: TablePaginationOptions = { perPage: 24, options: [12, 24, 48, 96] };

export function MediaGrid({
	state,
	params,
	onChangeParams,
	onSelect,
	onUploaded,
	folderId,
	onOpenImportUrl,
	selectedIds,
}: MediaGridProps): ReactNode {
	const t = useTranslation();
	const client = useClient();
	const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [dragOver, setDragOver] = useState(false);

	// ─── Search debounce ──────────────────────────────────────────────────────

	const handleSearch = useCallback(
		(value: string) => {
			if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
			searchTimerRef.current = setTimeout(() => {
				onChangeParams({ search: value, page: 1 });
			}, 300);
		},
		[onChangeParams],
	);

	// ─── Upload ───────────────────────────────────────────────────────────────

	async function uploadFiles(files: FileList | File[]) {
		setUploading(true);
		setUploadError(null);
		const arr = Array.from(files);
		for (const file of arr) {
			try {
				const item = await uploadMediaItem(client, { file, folderId });
				onUploaded(item);
			} catch (err) {
				setUploadError(err instanceof Error ? err.message : t("state.error"));
			}
		}
		setUploading(false);
	}

	// ─── Drag and drop ────────────────────────────────────────────────────────

	function handleDragOver(e: DragEvent<HTMLDivElement>) {
		e.preventDefault();
		setDragOver(true);
	}

	function handleDragLeave(e: DragEvent<HTMLDivElement>) {
		// only clear if leaving the container itself, not a child
		if (!e.currentTarget.contains(e.relatedTarget as Node)) {
			setDragOver(false);
		}
	}

	function handleDrop(e: DragEvent<HTMLDivElement>) {
		e.preventDefault();
		setDragOver(false);
		const files = e.dataTransfer.files;
		if (files.length > 0) {
			void uploadFiles(files);
		}
	}

	// ─── Render ───────────────────────────────────────────────────────────────

	const isReloading = state.kind === "reloading";
	const isLoading = state.kind === "loading";
	const items = state.kind === "loaded" || state.kind === "reloading" ? state.data.data : [];
	const total = state.kind === "loaded" || state.kind === "reloading" ? state.data.total : 0;

	const queryParams = {
		page: params.page,
		perPage: params.perPage,
	};

	return (
		<div className="flex flex-col gap-4" data-testid="media-grid">
			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-2">
				<Input
					type="search"
					placeholder={t("media.search.placeholder")}
					className="max-w-xs"
					defaultValue={params.search}
					onChange={(e) => handleSearch(e.target.value)}
					data-testid="media-search-input"
				/>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={uploading}
					onClick={() => fileInputRef.current?.click()}
					data-testid="media-upload-btn"
				>
					<UploadIcon className="mr-1.5 h-4 w-4" />
					{uploading ? t("field.upload.uploading") : t("media.toolbar.upload")}
				</Button>
				<input
					ref={fileInputRef}
					type="file"
					multiple
					className="sr-only"
					onChange={(e) => e.target.files && void uploadFiles(e.target.files)}
					data-testid="media-upload-input"
				/>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={onOpenImportUrl}
					data-testid="media-import-url-btn"
				>
					{t("media.toolbar.import_url")}
				</Button>
			</div>

			{uploadError && (
				<p
					role="alert"
					className="text-sm text-destructive"
					data-testid="media-upload-error"
				>
					{uploadError}
				</p>
			)}

			{/* Grid area with drag-and-drop */}
			<div
				className={cn(
					"relative min-h-40 rounded-md border-2 border-dashed transition-colors",
					dragOver ? "border-primary bg-primary/5" : "border-transparent",
				)}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				data-testid="media-drop-zone"
			>
				{isLoading && (
					<div
						className="flex h-40 items-center justify-center text-muted-foreground"
						data-testid="media-loading"
					>
						<Loader2Icon className="h-6 w-6 animate-spin" />
					</div>
				)}

				{!isLoading && items.length === 0 && (
					<div
						className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground"
						data-testid="media-empty"
					>
						<FileIcon className="h-8 w-8" />
						<span className="text-sm">{t("media.grid.empty")}</span>
					</div>
				)}

				{!isLoading && items.length > 0 && (
					<div className="grid grid-cols-3 gap-3 p-1 sm:grid-cols-4 md:grid-cols-6">
						{items.map((item) => (
							<MediaCard
								key={item.id}
								item={item}
								onSelect={onSelect}
								selected={selectedIds?.includes(item.id) ?? false}
							/>
						))}
					</div>
				)}

				{/* Keep-previous overlay */}
				{isReloading && (
					<div
						className="absolute inset-0 flex items-center justify-center rounded-md bg-background/60"
						data-testid="media-reloading-overlay"
					>
						<Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				)}
			</div>

			{/* Pagination */}
			{total > 0 && (
				<TablePagination
					total={total}
					queryParams={queryParams}
					paginationOptions={PAGINATION_OPTIONS}
					onChangeParams={(patch) =>
						onChangeParams({
							page: patch.page,
							perPage: patch.perPage,
						})
					}
				/>
			)}
		</div>
	);
}

// ─── MediaCard ────────────────────────────────────────────────────────────────

interface MediaCardProps {
	item: MediaItem;
	onSelect: (item: MediaItem) => void;
	selected?: boolean;
}

function MediaCard({ item, onSelect, selected = false }: MediaCardProps): ReactNode {
	const thumb = isImageMime(item.mime) ? (item.sizes.profile ?? item.url) : null;

	return (
		<button
			type="button"
			className={cn(
				"group flex flex-col gap-1 rounded-md border bg-card p-1.5 text-left transition-colors hover:border-primary hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				selected && "border-primary ring-2 ring-primary ring-offset-1",
			)}
			onClick={() => onSelect(item)}
			data-testid={`media-card-${item.id}`}
			aria-pressed={selected}
		>
			<div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded bg-muted">
				{thumb ? (
					<img
						src={thumb}
						alt={item.alt ?? item.name}
						className="h-full w-full object-cover"
						data-testid={`media-thumb-${item.id}`}
					/>
				) : (
					<FileIcon
						className="h-8 w-8 text-muted-foreground"
						data-testid={`media-icon-${item.id}`}
					/>
				)}
			</div>
			<p className="truncate text-xs font-medium leading-tight" title={item.name}>
				{item.name}
			</p>
			<p className="text-xs text-muted-foreground">{formatBytes(item.size)}</p>
		</button>
	);
}
