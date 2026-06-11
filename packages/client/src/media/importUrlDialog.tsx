/**
 * ImportUrlDialog — dialog for importing a media item from a URL.
 * 422 errors from the server are shown inline in the dialog.
 */
import { type ReactNode, useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ModalShell } from "../ui/modal-shell";
import type { MediaItem } from "./types";
import { importMediaUrl, useMediaClient } from "./useMediaApi";

interface ImportUrlDialogProps {
	open: boolean;
	folderId: string | null;
	onClose: () => void;
	onImported: (item: MediaItem) => void;
}

export function ImportUrlDialog({
	open,
	folderId,
	onClose,
	onImported,
}: ImportUrlDialogProps): ReactNode {
	const t = useTranslation();
	const client = useMediaClient();
	const [url, setUrl] = useState("");
	const [name, setName] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function reset() {
		setUrl("");
		setName("");
		setError(null);
		setBusy(false);
	}

	function handleClose() {
		reset();
		onClose();
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!url.trim()) {
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const item = await importMediaUrl(client, {
				url: url.trim(),
				name: name.trim() || undefined,
				folderId,
			});
			reset();
			onImported(item);
		} catch (err) {
			// Server sends localised message in 422 { message }; show as-is.
			setBusy(false);
			setError(err instanceof Error ? err.message : t("state.error"));
		}
	}

	const footer = (
		<>
			<Button type="button" variant="outline" onClick={handleClose} disabled={busy}>
				{t("action.cancel")}
			</Button>
			<Button
				type="submit"
				form="import-url-form"
				disabled={busy || !url.trim()}
				data-testid="import-url-submit"
			>
				{busy ? t("state.loading") : t("media.import_url.submit")}
			</Button>
		</>
	);

	return (
		<ModalShell
			open={open}
			onOpenChange={(v) => !v && handleClose()}
			title={t("media.import_url.title")}
			footer={footer}
			data-testid="import-url-dialog"
		>
			<form id="import-url-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
				<div className="flex flex-col gap-1.5">
					<label className="text-sm font-medium" htmlFor="import-url-url">
						{t("media.import_url.url_label")}
					</label>
					<Input
						id="import-url-url"
						type="url"
						value={url}
						onChange={(e) => setUrl(e.target.value)}
						placeholder="https://example.com/image.jpg"
						required
						disabled={busy}
						data-testid="import-url-input"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<label className="text-sm font-medium" htmlFor="import-url-name">
						{t("media.import_url.name_label")}
					</label>
					<Input
						id="import-url-name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder={t("media.import_url.name_placeholder")}
						disabled={busy}
						data-testid="import-url-name-input"
					/>
				</div>
				{error && (
					<p
						role="alert"
						className="text-sm text-destructive"
						data-testid="import-url-error"
					>
						{error}
					</p>
				)}
			</form>
		</ModalShell>
	);
}
