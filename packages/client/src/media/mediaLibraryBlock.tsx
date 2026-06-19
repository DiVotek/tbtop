/**
 * MediaLibraryBlock — full-page media library renderer for the `mediaLibrary` kind.
 * Layout: left folder tree + right grid with toolbar, breadcrumbs, pagination, detail panel.
 */
import { type ReactNode, useState } from "react";
import type { RenderProps } from "../render/blockRegistry";
import { FolderTree } from "./folderTree";
import { ImportUrlDialog } from "./importUrlDialog";
import { MediaBreadcrumbs } from "./mediaBreadcrumbs";
import { MediaDetail } from "./mediaDetail";
import { MediaGrid } from "./mediaGrid";
import type { MediaItem } from "./types";
import { useMediaFolders, useMediaItems } from "./useMediaApi";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MediaLibraryOptions {}

export function MediaLibraryBlock({
	options: _options,
}: RenderProps<MediaLibraryOptions>): ReactNode {
	// ─── Folder state ─────────────────────────────────────────────────────────
	const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
	const { folders, refetch: refetchFolders } = useMediaFolders();

	// ─── Query state ──────────────────────────────────────────────────────────
	const [queryParams, setQueryParams] = useState({
		folder: selectedFolder,
		search: "",
		page: 1,
		perPage: 24,
	});
	const { state, refetch } = useMediaItems(queryParams);

	function handleFolderSelect(id: string | null) {
		setSelectedFolder(id);
		setQueryParams((p) => ({ ...p, folder: id, page: 1, search: "" }));
	}

	function handleChangeParams(patch: Partial<typeof queryParams>) {
		setQueryParams((p) => ({ ...p, ...patch }));
	}

	// ─── Detail panel ─────────────────────────────────────────────────────────
	const [detailItem, setDetailItem] = useState<MediaItem | null>(null);

	function handleUpdated(updated: MediaItem) {
		setDetailItem(updated);
		refetch();
	}

	function handleDeleted(_id: string) {
		setDetailItem(null);
		refetch();
	}

	// ─── Import URL dialog ────────────────────────────────────────────────────
	const [importUrlOpen, setImportUrlOpen] = useState(false);

	function handleImported(_item: MediaItem) {
		setImportUrlOpen(false);
		refetch();
	}

	// ─── Uploaded ─────────────────────────────────────────────────────────────
	function handleUploaded(_item: MediaItem) {
		refetch();
	}

	return (
		<div className="flex h-full min-h-0 flex-col gap-4" data-testid="media-library">
			{/* Breadcrumbs */}
			<MediaBreadcrumbs
				folders={folders}
				selectedId={selectedFolder}
				onSelect={handleFolderSelect}
			/>

			<div className="flex min-h-0 flex-1 gap-4">
				{/* Left: folder tree */}
				<aside className="w-48 shrink-0 overflow-y-auto rounded-md border">
					<FolderTree
						folders={folders}
						selectedId={selectedFolder}
						onSelect={handleFolderSelect}
						onMutated={() => {
							refetchFolders();
						}}
					/>
				</aside>

				{/* Right: grid */}
				<div className="flex min-w-0 flex-1 flex-col">
					<MediaGrid
						state={state}
						params={queryParams}
						onChangeParams={handleChangeParams}
						onSelect={setDetailItem}
						onSelectFolder={handleFolderSelect}
						onUploaded={handleUploaded}
						folderId={selectedFolder}
						onOpenImportUrl={() => setImportUrlOpen(true)}
					/>
				</div>
			</div>

			{/* Detail panel */}
			<MediaDetail
				item={detailItem}
				folders={folders}
				onClose={() => setDetailItem(null)}
				onUpdated={handleUpdated}
				onDeleted={handleDeleted}
			/>

			{/* Import URL dialog */}
			<ImportUrlDialog
				open={importUrlOpen}
				folderId={selectedFolder}
				onClose={() => setImportUrlOpen(false)}
				onImported={handleImported}
			/>
		</div>
	);
}
