import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import type { LexicalEditor, RangeSelection } from "lexical";
import { $setSelection } from "lexical";
import { useEffect, useState } from "react";
import { useTranslation } from "../../i18n/i18n";
import { Button } from "../../ui/button";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "../../ui/revola";

export interface LinkDialogRequest {
	/** Selection when the dialog opened. Restored before dispatch — Radix's
	 * focus trap steals focus, and Lexical drops selection on blur. */
	selection: RangeSelection;
	/** Prefilled when the selection sits inside an existing LinkNode. */
	currentUrl: string | null;
}

interface LinkDialogProps {
	editor: LexicalEditor;
	request: LinkDialogRequest | null;
	onClose: () => void;
}

const SAFE_SCHEMES: Record<string, true> = {
	"http:": true,
	"https:": true,
	"mailto:": true,
	"tel:": true,
};

// UX gate, not the security boundary: LinkNode.sanitizeUrl re-checks every href
// at render time. Scheme-less values (paths, anchors, bare domains) are fine.
function isSafeUrl(value: string): boolean {
	const scheme = /^[a-z][a-z0-9+.-]*:/i.exec(value)?.[0];
	return scheme === undefined || SAFE_SCHEMES[scheme.toLowerCase()] === true;
}

// Replaces window.prompt("Enter URL") with a revola ResponsiveDialog:
// URL input, Apply/Cancel, and Remove-link (only when editing).
export function LinkDialog({ editor, request, onClose }: LinkDialogProps) {
	const t = useTranslation();
	const [url, setUrl] = useState("");

	useEffect(() => {
		setUrl(request?.currentUrl ?? "");
	}, [request]);

	const open = request !== null;
	const isEditing = Boolean(request?.currentUrl);

	const applyLink = (nextUrl: string | null) => {
		if (!request) {
			return;
		}
		editor.update(() => {
			$setSelection(request.selection.clone());
			editor.dispatchCommand(TOGGLE_LINK_COMMAND, nextUrl);
		});
		onClose();
	};

	const trimmedUrl = url.trim();
	const canApply = trimmedUrl.length > 0 && isSafeUrl(trimmedUrl);

	const handleApply = () => {
		if (!canApply) {
			return;
		}
		applyLink(trimmedUrl);
	};

	return (
		<ResponsiveDialog open={open} onOpenChange={(next) => !next && onClose()}>
			<ResponsiveDialogContent className="flex flex-col gap-4 p-6 sm:max-w-md">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>
						{t("field.richtext.link_dialog_title")}
					</ResponsiveDialogTitle>
				</ResponsiveDialogHeader>

				<label className="flex flex-col gap-1.5 text-sm">
					<span className="font-medium text-foreground">
						{t("field.richtext.link_url")}
					</span>
					<input
						autoFocus
						type="text"
						value={url}
						onChange={(e) => setUrl(e.target.value)}
						className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
					/>
				</label>

				<ResponsiveDialogFooter>
					{isEditing && (
						<Button
							type="button"
							variant="outline"
							onClick={() => applyLink(null)}
							data-testid="link-dialog-remove"
						>
							{t("field.richtext.link_remove")}
						</Button>
					)}
					<Button
						type="button"
						onClick={handleApply}
						disabled={!canApply}
						data-testid="link-dialog-apply"
					>
						{t("field.richtext.link_apply")}
					</Button>
				</ResponsiveDialogFooter>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
