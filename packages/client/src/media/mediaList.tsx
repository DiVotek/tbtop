/**
 * MediaList — list (table) view body over the same unified files the grid shows.
 * Folders render as the first rows (navigate on click), then file rows. Pure
 * presentation: pagination/toolbar/empty-state stay in MediaGrid.
 */
import { FolderIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "../i18n/i18n";
import { cn } from "../lib/cn";
import { Badge } from "../ui/badge";
import { fileKindOf } from "./fileType";
import { MediaThumb } from "./mediaThumb";
import type { MediaFolder, MediaItem } from "./types";
import { formatBytes } from "./useMediaApi";

interface MediaListProps {
	folders: MediaFolder[];
	items: MediaItem[];
	onSelect: (item: MediaItem) => void;
	onSelectFolder: (id: string) => void;
	selectedIds?: string[];
}

const CELL = "px-3 py-2 align-middle";
const HEAD = "px-3 py-2 text-left text-xs font-medium text-muted-foreground";

export function MediaList({
	folders,
	items,
	onSelect,
	onSelectFolder,
	selectedIds,
}: MediaListProps): ReactNode {
	const t = useTranslation();
	return (
		<table className="w-full border-collapse text-sm" data-testid="media-list">
			<thead>
				<tr className="border-b">
					<th className={HEAD}>{t("media.list.col_name")}</th>
					<th className={HEAD}>{t("media.list.col_type")}</th>
					<th className={HEAD}>{t("media.list.col_size")}</th>
					<th className={HEAD}>{t("media.list.col_tags")}</th>
					<th className={HEAD}>{t("media.list.col_date")}</th>
				</tr>
			</thead>
			<tbody>
				{folders.map((folder) => (
					<FolderRow key={folder.id} folder={folder} onSelect={onSelectFolder} />
				))}
				{items.map((item) => (
					<FileRow
						key={item.id}
						item={item}
						onSelect={onSelect}
						selected={selectedIds?.includes(item.id) ?? false}
					/>
				))}
			</tbody>
		</table>
	);
}

// ─── FolderRow ──────────────────────────────────────────────────────────────

function FolderRow({
	folder,
	onSelect,
}: {
	folder: MediaFolder;
	onSelect: (id: string) => void;
}): ReactNode {
	const t = useTranslation();
	return (
		<tr
			className="cursor-pointer border-b transition-colors hover:bg-accent/50"
			onClick={() => onSelect(folder.id)}
			data-testid={`media-list-folder-${folder.id}`}
		>
			<td className={CELL}>
				<span className="flex items-center gap-2">
					<FolderIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
					<span className="truncate font-medium">{folder.name}</span>
				</span>
			</td>
			<td className={cn(CELL, "text-muted-foreground")}>{t("media.list.folder_type")}</td>
			<td className={CELL} />
			<td className={CELL} />
			<td className={CELL} />
		</tr>
	);
}

// ─── FileRow ────────────────────────────────────────────────────────────────

function FileRow({
	item,
	onSelect,
	selected,
}: {
	item: MediaItem;
	onSelect: (item: MediaItem) => void;
	selected: boolean;
}): ReactNode {
	const { ext } = fileKindOf(item.mime, item.name);
	return (
		<tr
			className={cn(
				"cursor-pointer border-b transition-colors hover:bg-accent/50",
				selected && "bg-primary/10",
			)}
			onClick={() => onSelect(item)}
			data-testid={`media-list-row-${item.id}`}
			aria-selected={selected}
		>
			<td className={CELL}>
				<span className="flex items-center gap-2">
					<span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
						<MediaThumb item={item} size="sm" />
					</span>
					<span className="truncate font-medium" title={item.name}>
						{item.name}
					</span>
				</span>
			</td>
			<td className={cn(CELL, "text-muted-foreground")}>{ext}</td>
			<td className={cn(CELL, "text-muted-foreground")}>{formatBytes(item.size)}</td>
			<td className={CELL}>
				{item.tags.length > 0 && (
					<span className="flex flex-wrap gap-1">
						{item.tags.map((tag) => (
							<Badge key={tag} variant="secondary" className="text-[10px]">
								{tag}
							</Badge>
						))}
					</span>
				)}
			</td>
			<td className={cn(CELL, "whitespace-nowrap text-muted-foreground")}>
				{new Date(item.createdAt).toLocaleDateString()}
			</td>
		</tr>
	);
}
