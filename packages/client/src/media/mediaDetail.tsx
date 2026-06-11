/**
 * MediaDetail — side panel / responsive dialog for a selected MediaItem.
 * Shows preview, inline name/alt editing, folder move, replace, delete.
 */
import { FileIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { Button } from "../ui/button";
import { ModalShell } from "../ui/modal-shell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { MediaFolder, MediaItem } from "./types";
import {
	deleteMediaItem,
	formatBytes,
	isImageMime,
	patchMediaItem,
	replaceMediaItem,
	useMediaClient,
} from "./useMediaApi";

interface MediaDetailProps {
	item: MediaItem | null;
	folders: MediaFolder[];
	onClose: () => void;
	onUpdated: (item: MediaItem) => void;
	onDeleted: (id: string) => void;
}

export function MediaDetail({
	item,
	folders,
	onClose,
	onUpdated,
	onDeleted,
}: MediaDetailProps): ReactNode {
	if (!item) {
		return null;
	}

	return (
		<DetailShell
			item={item}
			folders={folders}
			onClose={onClose}
			onUpdated={onUpdated}
			onDeleted={onDeleted}
		/>
	);
}

// ─── DetailShell ──────────────────────────────────────────────────────────────
// Separate component so hooks aren't called conditionally in MediaDetail.

interface DetailShellProps {
	item: MediaItem;
	folders: MediaFolder[];
	onClose: () => void;
	onUpdated: (item: MediaItem) => void;
	onDeleted: (id: string) => void;
}

function DetailShell({
	item,
	folders,
	onClose,
	onUpdated,
	onDeleted,
}: DetailShellProps): ReactNode {
	const t = useTranslation();
	const client = useMediaClient();

	const [name, setName] = useState(item.name);
	const [alt, setAlt] = useState(item.alt ?? "");
	const [folderId, setFolderId] = useState<string>(item.folderId ?? "__root__");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const replaceRef = useRef<HTMLInputElement>(null);

	const thumb = isImageMime(item.mime) ? (item.sizes.profile ?? item.url) : null;

	async function handleSave() {
		setBusy(true);
		setError(null);
		try {
			const updated = await patchMediaItem(client, item.id, {
				name: name.trim() || item.name,
				alt: alt || undefined,
				folderId: folderId === "__root__" ? null : folderId,
			});
			onUpdated(updated);
		} catch (err) {
			setError(err instanceof Error ? err.message : t("entity.save.failed"));
		} finally {
			setBusy(false);
		}
	}

	async function handleReplace(files: FileList | null) {
		const file = files?.[0];
		if (!file) {
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const updated = await replaceMediaItem(client, item.id, file);
			onUpdated(updated);
		} catch (err) {
			setError(err instanceof Error ? err.message : t("state.error"));
		} finally {
			setBusy(false);
		}
	}

	async function handleDelete() {
		setBusy(true);
		setError(null);
		try {
			await deleteMediaItem(client, item.id);
			onDeleted(item.id);
			onClose();
		} catch (err) {
			setBusy(false);
			setError(err instanceof Error ? err.message : t("entity.delete.failed"));
		}
	}

	const footer = (
		<>
			{/* Delete with confirm */}
			{confirmDelete ? (
				<div className="flex items-center gap-2 text-sm">
					<span className="text-muted-foreground">
						{t("media.detail.delete_confirm")}
					</span>
					<Button
						type="button"
						variant="destructive"
						size="sm"
						onClick={handleDelete}
						disabled={busy}
						data-testid="detail-delete-confirm-btn"
					>
						{t("action.delete")}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => setConfirmDelete(false)}
						disabled={busy}
					>
						{t("action.cancel")}
					</Button>
				</div>
			) : (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="text-destructive hover:text-destructive"
					onClick={() => setConfirmDelete(true)}
					disabled={busy}
					data-testid="detail-delete-btn"
				>
					<Trash2Icon className="mr-1.5 h-4 w-4" />
					{t("action.delete")}
				</Button>
			)}

			<div className="ml-auto flex gap-2">
				<Button type="button" variant="outline" size="sm" disabled={busy} onClick={onClose}>
					{t("action.cancel")}
				</Button>
				<Button
					type="button"
					size="sm"
					onClick={handleSave}
					disabled={busy}
					data-testid="detail-save-btn"
				>
					{t("action.save")}
				</Button>
			</div>
		</>
	);

	return (
		<ModalShell
			open={true}
			onOpenChange={(v) => !v && onClose()}
			title={t("media.detail.title")}
			size="sm"
			onlyDialog
			footer={footer}
			data-testid="media-detail"
		>
			{/* Preview */}
			<div className="flex items-center justify-center rounded-md border bg-muted/40 p-4">
				{thumb ? (
					<img
						src={thumb}
						alt={item.alt ?? item.name}
						className="max-h-48 max-w-full rounded object-contain"
						data-testid="detail-preview-img"
					/>
				) : (
					<FileIcon
						className="h-16 w-16 text-muted-foreground"
						data-testid="detail-preview-icon"
					/>
				)}
			</div>

			{/* Metadata */}
			<dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
				<dt className="text-muted-foreground">{t("media.detail.mime")}</dt>
				<dd className="truncate">{item.mime}</dd>
				<dt className="text-muted-foreground">{t("media.detail.size")}</dt>
				<dd>{formatBytes(item.size)}</dd>
				<dt className="text-muted-foreground">{t("media.detail.created")}</dt>
				<dd>{new Date(item.createdAt).toLocaleDateString()}</dd>
			</dl>

			{/* Name */}
			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium" htmlFor="detail-name">
					{t("media.detail.name")}
				</label>
				<input
					id="detail-name"
					className="h-9 w-full rounded-md border px-3 py-1 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
					value={name}
					onChange={(e) => setName(e.target.value)}
					disabled={busy}
					data-testid="detail-name-input"
				/>
			</div>

			{/* Alt */}
			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium" htmlFor="detail-alt">
					{t("media.detail.alt")}
				</label>
				<textarea
					id="detail-alt"
					className="w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
					rows={2}
					value={alt}
					onChange={(e) => setAlt(e.target.value)}
					disabled={busy}
					data-testid="detail-alt-input"
				/>
			</div>

			{/* Move to folder */}
			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium">{t("media.detail.move_to_folder")}</label>
				<Select value={folderId} onValueChange={setFolderId} disabled={busy}>
					<SelectTrigger data-testid="detail-folder-select">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="__root__">{t("media.folder.all_files")}</SelectItem>
						{folders.map((f) => (
							<SelectItem key={f.id} value={f.id}>
								{f.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{error && (
				<p role="alert" className="text-sm text-destructive" data-testid="detail-error">
					{error}
				</p>
			)}

			{/* Replace file */}
			<div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={busy}
					onClick={() => replaceRef.current?.click()}
					data-testid="detail-replace-btn"
				>
					<UploadIcon className="mr-1.5 h-4 w-4" />
					{t("media.detail.replace")}
				</Button>
				<input
					ref={replaceRef}
					type="file"
					className="sr-only"
					onChange={(e) => handleReplace(e.target.files)}
					data-testid="detail-replace-input"
				/>
			</div>
		</ModalShell>
	);
}
