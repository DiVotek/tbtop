/**
 * MediaPickerField — form control + cell for kind=media.
 *
 * Form: opens a picker modal to select media items. Single-select rendering
 *       depends on options.variant — "inline" (default) is a Choose button
 *       next to a read-only filename display with a clear button; "preview"
 *       is a fully clickable preview block (dashed placeholder when empty,
 *       large image / typed file card when filled) with a corner clear
 *       button. Multiple mode always renders preview chips + Choose,
 *       regardless of variant.
 * Cell: icon + id stub (cells don't fetch; demo can enrich via column mapping).
 *
 * accept filtering: applied client-side only — the server list endpoint has no
 * mime filter. Server-side filtering can be added later.
 */
import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
	rectSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { FileIcon, ImageIcon, XIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import type { FieldCellProps, FieldFormProps } from "../fields/fieldProps";
import { useTranslation } from "../i18n/i18n";
import { cn } from "../lib/cn";
import { useLatest } from "../lib/useLatest";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ModalShell } from "../ui/modal-shell";
import { fileKindOf } from "./fileType";
import { FolderTree } from "./folderTree";
import { MediaGrid } from "./mediaGrid";
import { orderMediaItems, reorderMediaIds } from "./mediaOrder";
import { MediaPreviewChip, SortableMediaPreviewChip } from "./mediaPreviewChip";
import type { MediaItem } from "./types";
import type { MediaQueryParams } from "./useMediaApi";
import {
	fetchMediaItem,
	isImageMime,
	useMediaClient,
	useMediaFolders,
	useMediaItems,
} from "./useMediaApi";

// ─── Options ──────────────────────────────────────────────────────────────────

interface MediaPickerOptions {
	multiple?: boolean;
	reorderable?: boolean;
	/** client-side MIME filter, e.g. ['image/*', 'application/pdf'] */
	accept?: string[];
	/**
	 * Single-select display: "inline" (default) — Choose button + read-only
	 * filename field; "preview" — clickable preview block. Ignored in multiple
	 * mode (chips always).
	 */
	variant?: "inline" | "preview";
}

// ─── Value types ──────────────────────────────────────────────────────────────

/** Single: string id. Multiple: string[] ids. */
export type MediaPickerValue = string | string[];

// ─── accept helpers ───────────────────────────────────────────────────────────

function matchesAccept(mime: string, accept: string[]): boolean {
	if (accept.length === 0) {
		return true;
	}
	return accept.some((pattern) => {
		if (pattern.endsWith("/*")) {
			return mime.startsWith(pattern.slice(0, -1));
		}
		return mime === pattern;
	});
}

function filterByAccept(items: MediaItem[], accept: string[] | undefined): MediaItem[] {
	if (!accept || accept.length === 0) {
		return items;
	}
	return items.filter((item) => matchesAccept(item.mime, accept));
}

// ─── MediaPickerForm ──────────────────────────────────────────────────────────

export function MediaPickerForm({
	name,
	value,
	onChange,
	disabled,
	options,
}: FieldFormProps<MediaPickerValue, MediaPickerOptions>): ReactNode {
	const t = useTranslation();
	const client = useMediaClient();
	const multiple = options?.multiple ?? false;
	const reorderable = multiple && options?.reorderable === true;
	const accept = options?.accept;
	const variant = options?.variant ?? "inline";
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	const [resolvedItems, setResolvedItems] = useState<MediaItem[]>([]);
	const [pickerOpen, setPickerOpen] = useState(false);
	const run = useLatest();

	// Form values may arrive as JSON numbers (e.g. settings-backed forms);
	// coerce to strings so id comparisons never mix types.
	function resolveIds(v: MediaPickerValue | null | undefined): string[] {
		if (!v) {
			return [];
		}
		if (Array.isArray(v)) {
			return (v as Array<string | number>).map(String);
		}
		return [String(v as string | number)];
	}
	const ids = resolveIds(value);

	// Fetch items for known ids when value changes externally (e.g. form pre-fill)
	useEffect(() => {
		if (ids.length === 0) {
			setResolvedItems([]);
			return;
		}
		const resolvedIds = resolvedItems.map((i) => i.id);
		const same =
			ids.length === resolvedIds.length &&
			ids.every((id, index) => resolvedIds[index] === id);
		if (same) {
			return;
		}

		const missing = ids.filter((id) => !resolvedIds.includes(id));
		void run(() => Promise.all(missing.map((id) => fetchMediaItem(client, id))), {
			onResult: (fetched) => {
				setResolvedItems((prev) => {
					const map = new Map(prev.map((i) => [i.id, i]));
					for (const item of fetched) {
						map.set(item.id, item);
					}
					return ids.map((id) => map.get(id)).filter(Boolean) as MediaItem[];
				});
			},
			// silently ignore — items just won't have previews
			onError: () => {},
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ids.join(",")]);

	function handleSelected(item: MediaItem) {
		if (multiple) {
			const current = Array.isArray(value) ? (value as string[]) : [];
			if (!current.includes(item.id)) {
				setResolvedItems((prev) => [...prev, item]);
				onChange([...current, item.id]);
			}
		} else {
			setResolvedItems([item]);
			onChange(item.id);
			setPickerOpen(false);
		}
	}

	function handleConfirm(items: MediaItem[]) {
		setResolvedItems(items);
		onChange(items.map((i) => i.id));
		setPickerOpen(false);
	}

	function handleRemove(id: string) {
		const next = ids.filter((i) => i !== id);
		setResolvedItems((prev) => prev.filter((i) => i.id !== id));
		if (next.length === 0) {
			onChange(null);
		} else if (multiple) {
			onChange(next);
		} else {
			onChange(next[0] ?? null);
		}
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (disabled || !over || active.id === over.id) {
			return;
		}
		const nextIds = reorderMediaIds(ids, String(active.id), String(over.id));
		if (nextIds === ids) {
			return;
		}
		setResolvedItems((current) => orderMediaItems(current, nextIds));
		onChange(nextIds);
	}

	const hasValue = ids.length > 0;

	function handleClear() {
		setResolvedItems([]);
		onChange(null);
	}

	const singleControl =
		variant === "preview" ? (
			<MediaPreviewBlock
				name={name}
				item={resolvedItems[0]}
				onOpen={() => setPickerOpen(true)}
				onClear={handleClear}
				disabled={disabled}
			/>
		) : (
			<div className="flex items-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={disabled}
					onClick={() => setPickerOpen(true)}
					data-testid={`media-picker-choose-${name}`}
				>
					{t("media.picker.choose")}
				</Button>
				<Input
					readOnly
					value={resolvedItems[0]?.name ?? ""}
					placeholder={t("media.picker.no_selection")}
					data-testid={`media-picker-name-${name}`}
				/>
				{hasValue && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						disabled={disabled}
						onClick={handleClear}
						aria-label={t("media.picker.clear")}
						data-testid={`media-picker-clear-${name}`}
					>
						<XIcon className="h-4 w-4" />
					</Button>
				)}
			</div>
		);

	return (
		<div className="flex flex-col gap-2" data-testid={`media-picker-${name}`}>
			{multiple ? (
				<>
					{resolvedItems.length > 0 && (
						<MediaPreviewChips
							items={resolvedItems}
							reorderable={reorderable}
							disabled={disabled}
							sensors={sensors}
							onDragEnd={handleDragEnd}
							onRemove={handleRemove}
						/>
					)}
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={disabled}
							onClick={() => setPickerOpen(true)}
							data-testid={`media-picker-choose-${name}`}
						>
							{t("media.picker.choose")}
						</Button>
					</div>
				</>
			) : (
				singleControl
			)}

			{/* Picker modal */}
			<MediaPickerModal
				open={pickerOpen}
				multiple={multiple}
				accept={accept}
				initialItems={resolvedItems}
				onClose={() => setPickerOpen(false)}
				onSelect={handleSelected}
				onConfirm={handleConfirm}
			/>
		</div>
	);
}

interface MediaPreviewChipsProps {
	items: MediaItem[];
	reorderable: boolean;
	disabled?: boolean;
	sensors: ReturnType<typeof useSensors>;
	onDragEnd: (event: DragEndEvent) => void;
	onRemove: (id: string) => void;
}

function MediaPreviewChips(props: MediaPreviewChipsProps): ReactNode {
	const chips = props.items.map((item) => {
		const Chip = props.reorderable ? SortableMediaPreviewChip : MediaPreviewChip;
		return (
			<Chip
				key={item.id}
				item={item}
				onRemove={() => props.onRemove(item.id)}
				disabled={props.disabled}
			/>
		);
	});
	if (!props.reorderable) {
		return <div className="flex flex-wrap gap-2">{chips}</div>;
	}
	return (
		<DndContext
			sensors={props.sensors}
			collisionDetection={closestCenter}
			onDragEnd={props.onDragEnd}
			modifiers={[restrictToParentElement]}
		>
			<SortableContext
				items={props.items.map((item) => item.id)}
				strategy={rectSortingStrategy}
			>
				<div className="flex flex-wrap gap-2">{chips}</div>
			</SortableContext>
		</DndContext>
	);
}

// ─── MediaPreviewBlock ────────────────────────────────────────────────────────
// Single-select variant="preview": one fully clickable block. Empty — dashed
// placeholder inviting a choice; filled — large image (or typed file card)
// that reopens the picker on click, with a corner clear button.

function MediaPreviewBlock({
	name,
	item,
	onOpen,
	onClear,
	disabled,
}: {
	name: string;
	item?: MediaItem;
	onOpen: () => void;
	onClear: () => void;
	disabled?: boolean;
}): ReactNode {
	const t = useTranslation();
	return (
		<div className="relative">
			<button
				type="button"
				onClick={onOpen}
				disabled={disabled}
				className={cn(
					"flex h-48 w-full items-center justify-center overflow-hidden rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-50",
					item
						? "bg-muted hover:opacity-90"
						: "border-dashed text-muted-foreground hover:bg-muted/50",
				)}
				data-testid={`media-picker-preview-${name}`}
			>
				{item ? (
					<MediaPreviewBlockContent item={item} />
				) : (
					<span className="flex flex-col items-center gap-2">
						<ImageIcon className="h-8 w-8" />
						<span className="text-sm">{t("media.picker.choose_image")}</span>
					</span>
				)}
			</button>
			{item && !disabled && (
				<Button
					type="button"
					variant="secondary"
					size="sm"
					className="absolute top-2 right-2 h-6 w-6 p-0"
					onClick={onClear}
					aria-label={t("media.picker.clear")}
					data-testid={`media-picker-clear-${name}`}
				>
					<XIcon className="h-4 w-4" />
				</Button>
			)}
		</div>
	);
}

function MediaPreviewBlockContent({ item }: { item: MediaItem }): ReactNode {
	if (isImageMime(item.mime)) {
		return (
			<img
				src={item.sizes.profile?.url ?? item.url}
				alt={item.alt ?? item.name}
				className="h-full w-full object-cover"
				data-testid={`media-preview-img-${item.id}`}
			/>
		);
	}
	const { Icon, colorClass } = fileKindOf(item.mime, item.name);
	return (
		<span className="flex max-w-full flex-col items-center gap-2 px-3">
			<Icon
				className={cn("h-12 w-12", colorClass)}
				data-testid={`media-preview-icon-${item.id}`}
			/>
			<span className="max-w-full truncate text-sm text-foreground">{item.name}</span>
		</span>
	);
}

// ─── MediaPickerModal ─────────────────────────────────────────────────────────

interface MediaPickerModalProps {
	open: boolean;
	multiple: boolean;
	accept?: string[];
	initialItems: MediaItem[];
	onClose: () => void;
	onSelect: (item: MediaItem) => void;
	onConfirm: (items: MediaItem[]) => void;
}

// A closed picker must fire zero requests: useMediaItems/useMediaFolders live
// in a separate component that only mounts while open, instead of the modal
// body always mounting and merely hiding its dialog chrome.
function MediaPickerModal({ open, onClose, ...contentProps }: MediaPickerModalProps): ReactNode {
	if (!open) {
		return null;
	}
	return <MediaPickerModalContent onClose={onClose} {...contentProps} />;
}

function MediaPickerModalContent({
	multiple,
	accept,
	initialItems,
	onClose,
	onSelect,
	onConfirm,
}: Omit<MediaPickerModalProps, "open">): ReactNode {
	const t = useTranslation();
	const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
	const [selectedItems, setSelectedItems] = useState<MediaItem[]>(initialItems);
	const [queryParams, setQueryParams] = useState<MediaQueryParams>({
		folder: null,
		search: "",
		page: 1,
		perPage: 24,
	});
	const { state, refetch } = useMediaItems(queryParams);
	const { folders, refetch: refetchFolders } = useMediaFolders();

	function handleFolderSelect(id: string | null) {
		setSelectedFolder(id);
		setQueryParams((p) => ({ ...p, folder: id, page: 1, search: "" }));
	}

	function handleCardClick(item: MediaItem) {
		if (!multiple) {
			onSelect(item);
			setSelectedItems([]);
		} else {
			setSelectedItems((prev) => {
				const exists = prev.find((i) => i.id === item.id);
				return exists ? prev.filter((i) => i.id !== item.id) : [...prev, item];
			});
		}
	}

	function handleConfirm() {
		onConfirm(selectedItems);
		setSelectedItems([]);
	}

	function handleClose() {
		setSelectedItems([]);
		onClose();
	}

	// Apply client-side accept filter
	const filteredState =
		accept && accept.length > 0 && (state.kind === "loaded" || state.kind === "reloading")
			? { ...state, data: { ...state.data, data: filterByAccept(state.data.data, accept) } }
			: state;

	const footer = multiple ? (
		<>
			<Button type="button" variant="outline" onClick={handleClose}>
				{t("action.cancel")}
			</Button>
			<Button
				type="button"
				onClick={handleConfirm}
				disabled={selectedItems.length === 0}
				data-testid="media-picker-confirm"
			>
				{t("media.picker.confirm")} ({selectedItems.length})
			</Button>
		</>
	) : undefined;

	return (
		<ModalShell
			open
			onOpenChange={(v) => !v && handleClose()}
			title={multiple ? t("media.picker.title_multiple") : t("media.picker.title")}
			size="full"
			onlyDialog
			footer={footer}
			data-testid="media-picker-modal"
		>
			<div className="flex min-h-0 gap-4" style={{ height: "60vh" }}>
				{/* Folder tree */}
				<aside className="w-44 shrink-0 overflow-y-auto rounded-md border">
					<FolderTree
						folders={folders}
						selectedId={selectedFolder}
						onSelect={handleFolderSelect}
						onMutated={refetchFolders}
					/>
				</aside>

				{/* Grid */}
				<div className="min-w-0 flex-1 overflow-y-auto">
					<MediaGrid
						state={filteredState}
						params={queryParams}
						onChangeParams={(patch) => setQueryParams((p) => ({ ...p, ...patch }))}
						onSelect={handleCardClick}
						onSelectFolder={handleFolderSelect}
						onUploaded={() => refetch()}
						folderId={selectedFolder}
						onOpenImportUrl={() => {}}
						selectedIds={selectedItems.map((i) => i.id)}
					/>
				</div>
			</div>
		</ModalShell>
	);
}

// ─── MediaPickerCell ──────────────────────────────────────────────────────────

export function MediaPickerCell({
	value,
}: FieldCellProps<MediaPickerValue, MediaPickerOptions>): ReactNode {
	const id = Array.isArray(value) ? value[0] : value;
	if (!id) {
		return null;
	}

	// Cells don't fetch — show icon + id stub. Demo can enrich via column mapping.
	return (
		<span className="flex items-center gap-1 text-sm text-muted-foreground">
			<FileIcon className="h-4 w-4" />
			<span className="truncate">{id}</span>
		</span>
	);
}
