import { useNearestRow } from "../structure/rowContext";
import type { FieldCellProps } from "./fieldProps";
import { basename, looksLikeImage, type UploadValue } from "./uploadUtils";

interface UploadRowShape {
	path?: string;
	url?: string;
	filename?: string;
	sizes?: Array<{ url: string; width: number }>;
}

function thumbnailUrl(
	sizes: Array<{ url: string; width: number }> | undefined,
	fallback: string,
): string {
	const variants = sizes ?? [];
	if (variants.length === 0) {
		return fallback;
	}
	return variants.reduce((a, b) => (b.width < a.width ? b : a)).url ?? fallback;
}

export function UploadCell({
	value,
}: FieldCellProps<UploadValue | UploadValue[] | string | string[]>) {
	const row = useNearestRow() as UploadRowShape | null;

	if (Array.isArray(value)) {
		if (value.length === 0) {
			return null;
		}
		const first =
			typeof value[0] === "string" ? { path: value[0], url: "" } : (value[0] as UploadValue);
		if (!first) {
			return null;
		}
		const filename = basename(first.path);
		const isImg = looksLikeImage(first.url, first.path);
		return (
			<span className="flex items-center gap-1.5">
				{isImg ? (
					<img src={first.url} alt={filename} className="h-8 w-8 rounded object-cover" />
				) : null}
				<span className="text-muted-foreground">{value.length}</span>
			</span>
		);
	}

	if (typeof value === "string") {
		const filename = row?.filename ?? basename(value);
		const url = row?.url;
		if (url && looksLikeImage(url, filename)) {
			return (
				<img
					src={thumbnailUrl(row?.sizes, url)}
					alt={filename}
					className="h-8 w-8 rounded object-cover"
				/>
			);
		}
		return <span>{filename}</span>;
	}

	const item = value as UploadValue | null;
	const url = row?.url ?? item?.url;
	const path = row?.path ?? item?.path;
	const filename = row?.filename ?? (path ? basename(path) : undefined);
	if (!url && !filename) {
		return null;
	}
	if (looksLikeImage(url ?? "", filename ?? "")) {
		return (
			<img
				src={thumbnailUrl(row?.sizes, url ?? "")}
				alt={filename ?? ""}
				className="h-8 w-8 rounded object-cover"
			/>
		);
	}
	return <span>{filename}</span>;
}
