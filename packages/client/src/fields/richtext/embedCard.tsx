import "./lexicalCore";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { $getNodeByKey, type NodeKey } from "lexical";
import { Box, X } from "lucide-react";
import type { MouseEvent } from "react";
import { useTranslation } from "../../i18n/i18n";
import { cn } from "../../lib/cn";
import { Button } from "../../ui/button";
import { NodeIcon } from "../../ui/node-icon";
import { embedSummary, useEmbedController } from "./embedContext";

interface EmbedCardProps {
	nodeKey: NodeKey;
	kind: string;
	data: unknown;
}

export function EmbedCard({ nodeKey, kind, data }: EmbedCardProps) {
	const t = useTranslation();
	const [editor] = useLexicalComposerContext();
	const editable = useLexicalEditable();
	const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
	const ctrl = useEmbedController();
	const def = ctrl?.defs.find((d) => d.kind === kind);
	const interactive = editable && ctrl !== null && !ctrl.disabled;
	const canEdit = interactive && def !== undefined && def.fields.length > 0;

	let title = kind;
	if (def) {
		title = def.label;
	} else if (ctrl) {
		title = t("field.richtext.embed_unknown").replace("{kind}", kind);
	}
	const summary = def ? embedSummary(def, data) : title;

	const onClick = () => {
		if (!interactive) {
			return;
		}
		clearSelection();
		setSelected(true);
		if (canEdit) {
			ctrl.requestEdit(nodeKey);
		}
	};
	const onRemove = (e: MouseEvent) => {
		e.stopPropagation();
		editor.update(() => $getNodeByKey(nodeKey)?.remove());
	};

	return (
		<div
			className={cn(
				"my-2 flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2 text-sm",
				canEdit && "cursor-pointer hover:bg-muted",
				isSelected && interactive && "ring-2 ring-ring/50",
			)}
			data-testid={`richtext-embed-${kind}`}
			onClick={onClick}
		>
			<span className="text-muted-foreground">
				{def?.icon ? <NodeIcon icon={{ name: def.icon }} /> : <Box className="size-4" />}
			</span>
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="font-medium">{title}</span>
				{summary !== title && (
					<span className="truncate text-muted-foreground">{summary}</span>
				)}
			</span>
			{interactive && (
				<Button type="button" variant="ghost" size="sm" onClick={onRemove}>
					<X />
					{t("field.richtext.embed_remove")}
				</Button>
			)}
		</div>
	);
}
