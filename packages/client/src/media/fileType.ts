/**
 * fileKindOf — resolve a file's display kind (icon, color, extension label)
 * from its mime type, falling back to the filename extension when the mime
 * is generic, empty, or `application/octet-stream`.
 */
import {
	FileArchiveIcon,
	FileAudioIcon,
	FileIcon,
	FileSpreadsheetIcon,
	FileTextIcon,
	FileVideoIcon,
	ImageIcon,
} from "lucide-react";
import type { FileKind, FileTypeInfo } from "./types";

const GENERIC_MIMES = new Set(["", "application/octet-stream"]);

// Exact mime → kind (prefix mimes handled separately below).
const MIME_KINDS: Record<string, FileKind> = {
	"application/pdf": "pdf",
	"application/msword": "word",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": "word",
	"application/vnd.ms-excel": "excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "excel",
	// CSV is text/* but reads as a spreadsheet — match before the text/ prefix.
	"text/csv": "excel",
	"application/zip": "archive",
	"application/x-7z-compressed": "archive",
	"application/x-rar-compressed": "archive",
	"application/x-tar": "archive",
	"application/gzip": "archive",
};

// Filename extension → kind, used when the mime is generic/empty.
const EXT_KINDS: Record<string, FileKind> = {
	pdf: "pdf",
	doc: "word",
	docx: "word",
	xls: "excel",
	xlsx: "excel",
	csv: "excel",
	zip: "archive",
	"7z": "archive",
	rar: "archive",
	tar: "archive",
	gz: "archive",
	txt: "text",
	md: "text",
	png: "image",
	jpg: "image",
	jpeg: "image",
	gif: "image",
	webp: "image",
	svg: "image",
	mp3: "audio",
	wav: "audio",
	mp4: "video",
	mov: "video",
};

const KIND_PRESENTATION: Record<FileKind, { Icon: FileTypeInfo["Icon"]; colorClass: string }> = {
	image: { Icon: ImageIcon, colorClass: "text-muted-foreground" },
	pdf: { Icon: FileTextIcon, colorClass: "text-red-600" },
	word: { Icon: FileTextIcon, colorClass: "text-blue-600" },
	excel: { Icon: FileSpreadsheetIcon, colorClass: "text-green-600" },
	archive: { Icon: FileArchiveIcon, colorClass: "text-amber-600" },
	audio: { Icon: FileAudioIcon, colorClass: "text-muted-foreground" },
	video: { Icon: FileVideoIcon, colorClass: "text-muted-foreground" },
	text: { Icon: FileTextIcon, colorClass: "text-muted-foreground" },
	generic: { Icon: FileIcon, colorClass: "text-muted-foreground" },
};

// Short label shown when a name carries no parseable extension.
const KIND_LABELS: Record<FileKind, string> = {
	image: "IMG",
	pdf: "PDF",
	word: "DOC",
	excel: "XLS",
	archive: "ZIP",
	audio: "AUD",
	video: "VID",
	text: "TXT",
	generic: "FILE",
};

function extensionOf(name: string): string {
	const dot = name.lastIndexOf(".");
	if (dot < 1 || dot === name.length - 1) {
		return "";
	}
	return name.slice(dot + 1).toLowerCase();
}

function kindFromMime(mime: string): FileKind | null {
	if (GENERIC_MIMES.has(mime)) {
		return null;
	}
	if (MIME_KINDS[mime]) {
		return MIME_KINDS[mime];
	}
	if (mime.startsWith("image/")) {
		return "image";
	}
	if (mime.startsWith("audio/")) {
		return "audio";
	}
	if (mime.startsWith("video/")) {
		return "video";
	}
	if (mime.startsWith("text/")) {
		return "text";
	}
	return null;
}

export function fileKindOf(mime: string, name: string): FileTypeInfo {
	const ext = extensionOf(name);
	const kind = kindFromMime(mime) ?? EXT_KINDS[ext] ?? "generic";
	const presentation = KIND_PRESENTATION[kind];
	return {
		kind,
		Icon: presentation.Icon,
		colorClass: presentation.colorClass,
		ext: ext ? ext.toUpperCase() : KIND_LABELS[kind],
	};
}
