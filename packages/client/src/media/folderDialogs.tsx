/**
 * Folder management dialogs — replace window.prompt / window.confirm.
 *
 * FolderNameDialog  — prompt for a folder name (create or rename).
 * FolderDeleteDialog — confirm destructive folder delete.
 */
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ConfirmDialog, ModalShell } from "../ui/modal-shell";

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

	const footer = (
		<>
			<Button type="button" variant="outline" onClick={onClose}>
				{t("action.cancel")}
			</Button>
			<Button
				type="submit"
				form="folder-name-form"
				disabled={!value.trim()}
				data-testid="folder-name-confirm"
			>
				{t("action.confirm")}
			</Button>
		</>
	);

	return (
		<ModalShell
			open={open}
			onOpenChange={(v) => !v && onClose()}
			title={title}
			footer={footer}
			data-testid="folder-name-dialog"
		>
			<form id="folder-name-form" onSubmit={handleSubmit}>
				<Input
					ref={inputRef}
					value={value}
					onChange={(e) => setValue(e.target.value)}
					placeholder={t("media.folder.name_prompt")}
					data-testid="folder-name-input"
					autoComplete="off"
				/>
			</form>
		</ModalShell>
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
		<ConfirmDialog
			open={open}
			onOpenChange={(v) => !v && onClose()}
			title={t("media.folder.delete")}
			body={`${t("media.folder.delete_confirm")}${folderName ? ` "${folderName}"` : ""}`}
			confirmLabel={t("action.delete")}
			destructive
			onConfirm={onConfirm}
			data-testid="folder-delete-dialog"
		/>
	);
}
