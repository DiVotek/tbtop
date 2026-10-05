import type { FieldCellProps } from "./fieldProps";
import { basename, looksLikeImage, type UploadValue } from "./uploadUtils";

// Renders from its own value only. Sibling row fields are not read: the server
// projects a row down to declared columns, so they would not reach the client.
// A thumbnail column is an `image` column over a URL attribute.
export function UploadCell({
	value,
}: FieldCellProps<UploadValue | UploadValue[] | string | string[]>) {
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
		const isImg = first.url !== "" && looksLikeImage(first.url, first.path);
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
		return <span>{basename(value)}</span>;
	}

	if (!value) {
		return null;
	}
	const filename = basename(value.path);
	if (value.url && looksLikeImage(value.url, filename)) {
		return <img src={value.url} alt={filename} className="h-8 w-8 rounded object-cover" />;
	}
	return <span>{filename}</span>;
}
