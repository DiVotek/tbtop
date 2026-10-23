import { Multiple, mixin } from "./concerns";
import { Field } from "./field";

export type StoredFile = { path: string; url: string };
export type SaveUpload = (file: File, config: Record<string, unknown>) => Promise<StoredFile>;

/** File upload to a storage disk (Upload.php). */
export class Upload<N extends string = string> extends Field<N, string | string[] | null> {
	readonly kind = "upload";
	private saveFn?: SaveUpload;

	/** Custom storage: receives the file and resolved config, returns `{path, url}`. */
	saveUsing(fn: SaveUpload): this {
		this.saveFn = fn;
		return this;
	}

	saveClosure(): SaveUpload | undefined {
		return this.saveFn;
	}

	/** Accepted MIME types / extensions; a list is comma-joined. */
	accept(accept: string | string[]): this {
		return this.set("accept", Array.isArray(accept) ? accept.join(",") : accept);
	}

	/** Storage disk name (default 'public'). */
	disk(disk: string): this {
		return this.set("disk", disk);
	}

	/** Subdirectory the file is stored under (default 'uploads'). */
	directory(dir: string): this {
		return this.set("directory", dir);
	}

	/** Storage visibility: 'public' (default) or 'private'. */
	visibility(visibility: "public" | "private"): this {
		return this.set("visibility", visibility);
	}

	/** Max upload size in bytes (default 5 MiB). */
	maxSize(bytes: number): this {
		return this.set("maxSize", bytes);
	}

	/** Convert the stored image ('webp'|'jpeg'|'png'). */
	convertTo(format: "webp" | "jpeg" | "png"): this {
		return this.setImage("convertTo", format);
	}

	/** Encoder quality (1-100) for the converted image. */
	quality(q: number): this {
		return this.setImage("quality", q);
	}

	/** Maximum number of files when multiple. */
	maxFiles(max: number): this {
		return this.set("maxFiles", max);
	}

	/** Drag-to-reorder when multiple. */
	reorderable(value = true): this {
		return this.set("reorderable", value);
	}

	private setImage(key: string, value: unknown): this {
		const image = (this.optionValue("image") as Record<string, unknown> | undefined) ?? {};
		return this.set("image", { ...image, [key]: value });
	}
}
export interface Upload<N extends string = string> extends Multiple {}
mixin(Upload, [Multiple]);

/** Media-library picker; the value is an id or a list of ids (MediaPicker.php). */
export class MediaPicker<N extends string = string> extends Field<
	N,
	string | number | (string | number)[] | null
> {
	readonly kind = "media";

	/** Allow selecting more than one item. */
	multiple(value = true): this {
		return this.set("multiple", value);
	}

	/** Drag-to-reorder when multiple. */
	reorderable(value = true): this {
		return this.set("reorderable", value);
	}

	/** MIME types visible/uploadable in the picker, e.g. ['image/*']. */
	accept(mimes: string[]): this {
		return this.set("accept", mimes);
	}

	/** 'inline' (default) or 'preview'; single-select only. */
	variant(variant: "inline" | "preview"): this {
		return this.set("variant", variant);
	}
}
