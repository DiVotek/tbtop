/**
 * FolderCard — a folder shown inside the media grid. Single-click navigates
 * into the folder. Card chrome mirrors MediaCard for visual consistency.
 */
import { FolderIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { MediaFolder } from "./types";

interface FolderCardProps {
	folder: MediaFolder;
	onSelect: (id: string) => void;
}

export function FolderCard({ folder, onSelect }: FolderCardProps): ReactNode {
	return (
		<button
			type="button"
			className="group flex flex-col gap-1 rounded-md border bg-card p-1.5 text-left transition-colors hover:border-primary hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			onClick={() => onSelect(folder.id)}
			data-testid={`folder-card-${folder.id}`}
			title={folder.name}
		>
			<div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded bg-muted">
				<FolderIcon className="h-10 w-10 text-muted-foreground" />
			</div>
			<p className="truncate text-xs font-medium leading-tight">{folder.name}</p>
		</button>
	);
}
