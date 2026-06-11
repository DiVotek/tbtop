/**
 * FolderTree — left-panel folder navigation with create/rename/delete via context menu.
 * Folder mutations use proper dialogs instead of window.prompt / window.confirm.
 */
import { FolderIcon, FolderOpenIcon, MoreHorizontalIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { cn } from "../lib/cn";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { FolderDeleteDialog, FolderNameDialog } from "./folderDialogs";
import type { MediaFolder } from "./types";
import { createFolder, deleteFolder, renameFolder, useMediaClient } from "./useMediaApi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FolderNode extends MediaFolder {
	children: FolderNode[];
}

interface FolderTreeProps {
	folders: MediaFolder[];
	selectedId: string | null;
	onSelect: (id: string | null) => void;
	onMutated: () => void;
}

// ─── Dialog state ─────────────────────────────────────────────────────────────

type DialogState =
	| { kind: "closed" }
	| { kind: "create"; parentId: string | null }
	| { kind: "rename"; folder: MediaFolder }
	| { kind: "delete"; folder: MediaFolder };

// Rows host a real <button> (menu trigger), so the row itself must be a
// div[role=button] — button-in-button is invalid HTML (hydration warning).
function rowButtonProps(onActivate: () => void) {
	return {
		role: "button" as const,
		tabIndex: 0,
		onClick: onActivate,
		onKeyDown: (e: React.KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				onActivate();
			}
		},
	};
}

// ─── Tree build ───────────────────────────────────────────────────────────────

function buildTree(folders: MediaFolder[]): FolderNode[] {
	const map = new Map<string, FolderNode>();
	for (const f of folders) {
		map.set(f.id, { ...f, children: [] });
	}
	const roots: FolderNode[] = [];
	for (const node of map.values()) {
		if (node.parentId === null) {
			roots.push(node);
		} else {
			map.get(node.parentId)?.children.push(node);
		}
	}
	return roots;
}

// ─── FolderTree ───────────────────────────────────────────────────────────────

export function FolderTree({
	folders,
	selectedId,
	onSelect,
	onMutated,
}: FolderTreeProps): ReactNode {
	const t = useTranslation();
	const client = useMediaClient();
	const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
	const [error, setError] = useState<string | null>(null);
	const tree = buildTree(folders);

	// ─── Handlers ──────────────────────────────────────────────────────────────

	async function handleCreateConfirm(name: string) {
		if (dialog.kind !== "create") {
			return;
		}
		const parentId = dialog.parentId;
		setDialog({ kind: "closed" });
		try {
			await createFolder(client, name, parentId);
			onMutated();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	}

	async function handleRenameConfirm(name: string) {
		if (dialog.kind !== "rename") {
			return;
		}
		const folder = dialog.folder;
		if (name === folder.name) {
			setDialog({ kind: "closed" });
			return;
		}
		setDialog({ kind: "closed" });
		try {
			await renameFolder(client, folder.id, name);
			onMutated();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	}

	async function handleDeleteConfirm() {
		if (dialog.kind !== "delete") {
			return;
		}
		const folder = dialog.folder;
		setDialog({ kind: "closed" });
		try {
			await deleteFolder(client, folder.id);
			if (selectedId === folder.id) {
				onSelect(null);
			}
			onMutated();
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			setError(msg);
		}
	}

	// ─── Render ────────────────────────────────────────────────────────────────

	return (
		<div className="flex flex-col gap-1 p-2" data-testid="folder-tree">
			{/* Root (All files) */}
			<div
				{...rowButtonProps(() => onSelect(null))}
				className={cn(
					"flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
					selectedId === null && "bg-muted font-medium",
				)}
				data-testid="folder-all"
			>
				{selectedId === null ? (
					<FolderOpenIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
				) : (
					<FolderIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
				)}
				<span className="flex-1 truncate text-left">{t("media.folder.all_files")}</span>
				<ContextMenuButton
					onRename={undefined}
					onDelete={undefined}
					onCreateChild={() => setDialog({ kind: "create", parentId: null })}
				/>
			</div>

			{/* Folder list */}
			{tree.map((node) => (
				<FolderItem
					key={node.id}
					node={node}
					selectedId={selectedId}
					onSelect={onSelect}
					onRename={(folder) => setDialog({ kind: "rename", folder })}
					onDelete={(folder) => setDialog({ kind: "delete", folder })}
					onCreateChild={(parentId) => setDialog({ kind: "create", parentId })}
					depth={0}
				/>
			))}

			{error && (
				<p className="px-2 text-xs text-destructive" role="alert">
					{error}
				</p>
			)}

			{/* Dialogs */}
			<FolderNameDialog
				open={dialog.kind === "create"}
				initial=""
				title={t("media.folder.create_child")}
				onConfirm={handleCreateConfirm}
				onClose={() => setDialog({ kind: "closed" })}
			/>
			<FolderNameDialog
				open={dialog.kind === "rename"}
				initial={dialog.kind === "rename" ? dialog.folder.name : ""}
				title={t("media.folder.rename")}
				onConfirm={handleRenameConfirm}
				onClose={() => setDialog({ kind: "closed" })}
			/>
			<FolderDeleteDialog
				open={dialog.kind === "delete"}
				folderName={dialog.kind === "delete" ? dialog.folder.name : ""}
				onConfirm={handleDeleteConfirm}
				onClose={() => setDialog({ kind: "closed" })}
			/>
		</div>
	);
}

// ─── FolderItem ───────────────────────────────────────────────────────────────

interface FolderItemProps {
	node: FolderNode;
	selectedId: string | null;
	onSelect: (id: string | null) => void;
	onRename: (folder: MediaFolder) => void;
	onDelete: (folder: MediaFolder) => void;
	onCreateChild: (parentId: string | null) => void;
	depth: number;
}

function FolderItem({
	node,
	selectedId,
	onSelect,
	onRename,
	onDelete,
	onCreateChild,
	depth,
}: FolderItemProps): ReactNode {
	const isSelected = selectedId === node.id;
	return (
		<div>
			<div
				{...rowButtonProps(() => onSelect(node.id))}
				className={cn(
					"flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
					isSelected && "bg-muted font-medium",
				)}
				style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
				data-testid={`folder-item-${node.id}`}
			>
				{isSelected ? (
					<FolderOpenIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
				) : (
					<FolderIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
				)}
				<span className="flex-1 truncate text-left">{node.name}</span>
				<ContextMenuButton
					onRename={() => onRename(node)}
					onDelete={() => onDelete(node)}
					onCreateChild={() => onCreateChild(node.id)}
				/>
			</div>
			{node.children.map((child) => (
				<FolderItem
					key={child.id}
					node={child}
					selectedId={selectedId}
					onSelect={onSelect}
					onRename={onRename}
					onDelete={onDelete}
					onCreateChild={onCreateChild}
					depth={depth + 1}
				/>
			))}
		</div>
	);
}

// ─── ContextMenuButton ────────────────────────────────────────────────────────

interface ContextMenuButtonProps {
	onRename: (() => void) | undefined;
	onDelete: (() => void) | undefined;
	onCreateChild: () => void;
}

function ContextMenuButton({
	onRename,
	onDelete,
	onCreateChild,
}: ContextMenuButtonProps): ReactNode {
	const t = useTranslation();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
					onClick={(e) => e.stopPropagation()}
					data-testid="folder-menu-trigger"
				>
					<MoreHorizontalIcon className="h-3 w-3" />
					<span className="sr-only">{t("media.folder.menu_label")}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onSelect={onCreateChild} data-testid="folder-menu-create">
					{t("media.folder.create_child")}
				</DropdownMenuItem>
				{onRename && (
					<DropdownMenuItem onSelect={onRename} data-testid="folder-menu-rename">
						{t("media.folder.rename")}
					</DropdownMenuItem>
				)}
				{onDelete && (
					<DropdownMenuItem
						onSelect={onDelete}
						className="text-destructive"
						data-testid="folder-menu-delete"
					>
						{t("media.folder.delete")}
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
