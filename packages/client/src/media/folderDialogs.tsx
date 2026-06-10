/**
 * Folder management dialogs — replace window.prompt / window.confirm.
 *
 * FolderNameDialog  — prompt for a folder name (create or rename).
 * FolderDeleteDialog — confirm destructive folder delete.
 */
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";

// ─── FolderNameDialog ─────────────────────────────────────────────────────────

interface FolderNameDialogProps {
	open: boolean;
	/** Pre-filled value for rename; empty string for create. */
	initial: string;
	/** Title rendered in the dialog header. */
	title: string;
	onConfirm: (name: string) => void;
	onClose: () => void;
}

export function FolderNameDialog({
	open,
	initial,
	title,
	onConfirm,
	onClose,
}: FolderNameDialogProps): ReactNode {
	const t = useTranslation();
	const [value, setValue] = useState(initial);
	const inputRef = useRef<HTMLInputElement>(null);

	// Reset value when dialog opens with a new initial
	useEffect(() => {
		if (open) {
			setValue(initial);
			// Focus after Radix mounts content
			requestAnimationFrame(() => inputRef.current?.focus());
		}
	}, [open, initial]);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = value.trim();
		if (!trimmed) return;
		onConfirm(trimmed);
	}

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent data-testid="folder-name-dialog">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<Input
						ref={inputRef}
						value={value}
						onChange={(e) => setValue(e.target.value)}
						placeholder={t("media.folder.name_prompt")}
						data-testid="folder-name-input"
						autoComplete="off"
					/>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
							{t("action.cancel")}
						</Button>
						<Button
							type="submit"
							disabled={!value.trim()}
							data-testid="folder-name-confirm"
						>
							{t("action.confirm")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ─── FolderDeleteDialog ───────────────────────────────────────────────────────

interface FolderDeleteDialogProps {
	open: boolean;
	folderName: string;
	onConfirm: () => void;
	onClose: () => void;
}

export function FolderDeleteDialog({
	open,
	folderName,
	onConfirm,
	onClose,
}: FolderDeleteDialogProps): ReactNode {
	const t = useTranslation();

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent data-testid="folder-delete-dialog">
				<DialogHeader>
					<DialogTitle>{t("media.folder.delete")}</DialogTitle>
				</DialogHeader>
				<p className="text-sm text-muted-foreground">
					{t("media.folder.delete_confirm")}
					{folderName ? ` "${folderName}"` : ""}
				</p>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose}>
						{t("action.cancel")}
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={onConfirm}
						data-testid="folder-delete-confirm"
					>
						{t("action.delete")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
