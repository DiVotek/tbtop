/**
 * MediaBreadcrumbs — path from "All files" to the current folder.
 */
import { ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "../i18n/i18n";
import { cn } from "../lib/cn";
import type { MediaFolder } from "./types";

interface MediaBreadcrumbsProps {
	folders: MediaFolder[];
	selectedId: string | null;
	onSelect: (id: string | null) => void;
}

export function MediaBreadcrumbs({
	folders,
	selectedId,
	onSelect,
}: MediaBreadcrumbsProps): ReactNode {
	const t = useTranslation();
	const crumbs = buildCrumbs(folders, selectedId);

	return (
		<nav
			className="flex items-center gap-1 text-sm text-muted-foreground"
			aria-label="breadcrumb"
			data-testid="media-breadcrumbs"
		>
			<button
				type="button"
				className={cn(
					"hover:text-foreground",
					selectedId === null && "font-medium text-foreground",
				)}
				onClick={() => onSelect(null)}
				data-testid="breadcrumb-root"
			>
				{t("media.folder.all_files")}
			</button>
			{crumbs.map((folder) => (
				<span key={folder.id} className="flex items-center gap-1">
					<ChevronRightIcon className="h-3 w-3" />
					<button
						type="button"
						className={cn(
							"hover:text-foreground",
							selectedId === folder.id && "font-medium text-foreground",
						)}
						onClick={() => onSelect(folder.id)}
						data-testid={`breadcrumb-${folder.id}`}
					>
						{folder.name}
					</button>
				</span>
			))}
		</nav>
	);
}

function buildCrumbs(folders: MediaFolder[], selectedId: string | null): MediaFolder[] {
	if (selectedId === null) {
		return [];
	}
	const map = new Map(folders.map((f) => [f.id, f]));
	const result: MediaFolder[] = [];
	let current = map.get(selectedId);
	while (current) {
		result.unshift(current);
		current = current.parentId ? map.get(current.parentId) : undefined;
	}
	return result;
}
