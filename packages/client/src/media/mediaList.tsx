/**
 * MediaList — list (table) view body over the same unified files the grid shows.
 * Folders render as the first rows (navigate on click), then file rows. Pure
 * presentation: pagination/toolbar/empty-state stay in MediaGrid.
 */
import { ChevronDownIcon, ChevronUpIcon, FolderIcon } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { useTranslation } from "../i18n/i18n";
import { cn } from "../lib/cn";
import { Badge } from "../ui/badge";
import { fileKindOf } from "./fileType";
import { MediaThumb } from "./mediaThumb";
import type { MediaFolder, MediaItem } from "./types";
import type { MediaSortColumn, MediaSortDir } from "./useMediaApi";
import { formatBytes } from "./useMediaApi";

interface MediaListProps {
	folders: MediaFolder[];
	items: MediaItem[];
	onSelect: (item: MediaItem) => void;
	onSelectFolder: (id: string) => void;
	sort?: MediaSortColumn;
	dir?: MediaSortDir;
	onSort: (column: MediaSortColumn) => void;
	selectedIds?: string[];
}

const CELL = "px-3 py-2 align-middle";
const HEAD = "px-3 py-2 text-left text-xs font-medium text-muted-foreground";

/** Header keys that drive a server sort; Type/Tags map to no column. */
type SortHeaderKey = "name" | "size" | "date";

const SORT_COLUMNS: Record<SortHeaderKey, MediaSortColumn> = {
	name: "name",
	size: "size",
	date: "created_at",
};

export function MediaList({
	folders,
	items,
	onSelect,
	onSelectFolder,
	sort,
	dir,
	onSort,
	selectedIds,
}: MediaListProps): ReactNode {
	const t = useTranslation();
	return (
		<table className="w-full border-collapse text-sm" data-testid="media-list">
			<thead>
				<tr className="border-b">
					<SortHead
						label={t("media.list.col_name")}
						column="name"
						sort={sort}
						dir={dir}
						onSort={onSort}
					/>
					<th className={HEAD}>{t("media.list.col_type")}</th>
					<SortHead
						label={t("media.list.col_size")}
						column="size"
						sort={sort}
						dir={dir}
						onSort={onSort}
					/>
					<th className={HEAD}>{t("media.list.col_tags")}</th>
					<SortHead
						label={t("media.list.col_date")}
						column="date"
						sort={sort}
						dir={dir}
						onSort={onSort}
					/>
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

// ─── SortHead ───────────────────────────────────────────────────────────────

function SortHead({
	label,
	column,
	sort,
	dir,
	onSort,
}: {
	label: string;
	column: SortHeaderKey;
	sort?: MediaSortColumn;
	dir?: MediaSortDir;
	onSort: (column: MediaSortColumn) => void;
}): ReactNode {
	const serverColumn = SORT_COLUMNS[column];
	const active = sort === serverColumn;
	const ascending = dir === "asc";
	const Chevron = ascending ? ChevronUpIcon : ChevronDownIcon;
	let ariaSort: "ascending" | "descending" | "none" = "none";
	if (active) {
		ariaSort = ascending ? "ascending" : "descending";
	}
	return (
		<th className={HEAD} aria-sort={ariaSort}>
			<button
				type="button"
				className="flex items-center gap-1 font-medium hover:text-foreground"
				onClick={() => onSort(serverColumn)}
				data-testid={`media-list-sort-${column}`}
			>
				{label}
				{active && <Chevron className="h-3.5 w-3.5" />}
			</button>
		</th>
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
			className="cursor-pointer border-b transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
			tabIndex={0}
			onClick={() => onSelect(folder.id)}
			onKeyDown={(e) => activateOnEnterOrSpace(e, () => onSelect(folder.id))}
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
				"cursor-pointer border-b transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none",
				selected && "bg-primary/10",
			)}
			tabIndex={0}
			onClick={() => onSelect(item)}
			onKeyDown={(e) => activateOnEnterOrSpace(e, () => onSelect(item))}
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

function activateOnEnterOrSpace(e: KeyboardEvent, run: () => void): void {
	if (e.key === "Enter" || e.key === " ") {
		e.preventDefault();
		run();
	}
}
