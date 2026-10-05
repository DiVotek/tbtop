import { Blocks } from "lucide-react";
import { useTranslation } from "../../../i18n/i18n";
import { Button } from "../../../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../../../ui/dropdown-menu";
import { NodeIcon } from "../../../ui/node-icon";
import { useEmbedController } from "../embedContext";

/** The toolbar's "Block" button: one entry per declared embed. Absent without embeds. */
export function EmbedMenu() {
	const t = useTranslation();
	const ctrl = useEmbedController();
	if (!ctrl || ctrl.disabled || ctrl.defs.length === 0) {
		return null;
	}
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="text-muted-foreground"
					data-testid="richtext-embed-menu"
				>
					<Blocks />
					{t("field.richtext.embed_button")}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start">
				{ctrl.defs.map((def) => (
					<DropdownMenuItem key={def.kind} onSelect={() => ctrl.requestInsert(def)}>
						{def.icon && <NodeIcon icon={{ name: def.icon }} />}
						{def.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
