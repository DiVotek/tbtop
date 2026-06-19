import { describe, expect, test } from "bun:test";
import {
	FileArchiveIcon,
	FileAudioIcon,
	FileIcon,
	FileSpreadsheetIcon,
	FileTextIcon,
	FileVideoIcon,
	ImageIcon,
} from "lucide-react";
import { fileKindOf } from "./fileType";

describe("fileKindOf: mime → kind", () => {
	test.each([
		["image/png", "photo.png", "image", ImageIcon],
		["application/pdf", "doc.pdf", "pdf", FileTextIcon],
		["application/msword", "letter.doc", "word", FileTextIcon],
		[
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"letter.docx",
			"word",
			FileTextIcon,
		],
		["application/vnd.ms-excel", "sheet.xls", "excel", FileSpreadsheetIcon],
		[
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"sheet.xlsx",
			"excel",
			FileSpreadsheetIcon,
		],
		["application/zip", "bundle.zip", "archive", FileArchiveIcon],
		["application/x-7z-compressed", "bundle.7z", "archive", FileArchiveIcon],
		["application/x-rar-compressed", "bundle.rar", "archive", FileArchiveIcon],
		["application/x-tar", "bundle.tar", "archive", FileArchiveIcon],
		["application/gzip", "bundle.gz", "archive", FileArchiveIcon],
		["audio/mpeg", "track.mp3", "audio", FileAudioIcon],
		["video/mp4", "clip.mp4", "video", FileVideoIcon],
		["text/plain", "notes.txt", "text", FileTextIcon],
		// text/csv is text/* but must read as a spreadsheet, not text.
		["text/csv", "data.csv", "excel", FileSpreadsheetIcon],
	])("%s resolves to %s", (mime, name, kind, Icon) => {
		const info = fileKindOf(mime as string, name as string);
		expect(info.kind as string).toBe(kind as string);
		expect(info.Icon).toBe(Icon as typeof FileIcon);
	});

	test("unknown mime with no extension hint resolves to generic", () => {
		const info = fileKindOf("application/x-unknown", "mystery");
		expect(info.kind).toBe("generic");
		expect(info.Icon).toBe(FileIcon);
	});
});

describe("fileKindOf: extension fallback when mime is generic", () => {
	test.each([
		["application/octet-stream", "report.pdf", "pdf"],
		["", "data.csv", "excel"],
		["application/octet-stream", "archive.rar", "archive"],
		["", "song.wav", "audio"],
		["application/octet-stream", "movie.mov", "video"],
		["", "readme.md", "text"],
		["application/octet-stream", "icon.svg", "image"],
	])("%s + %s resolves to %s via extension", (mime, name, kind) => {
		expect(fileKindOf(mime as string, name as string).kind as string).toBe(kind as string);
	});

	test("generic mime with unknown extension stays generic", () => {
		expect(fileKindOf("application/octet-stream", "thing.qzx").kind).toBe("generic");
	});
});

describe("fileKindOf: ext label", () => {
	test("uppercases the filename extension", () => {
		expect(fileKindOf("application/pdf", "report.PDF").ext).toBe("PDF");
		expect(fileKindOf("application/vnd.ms-excel", "data.xlsx").ext).toBe("XLSX");
	});

	test("falls back to a kind label when the name has no extension", () => {
		expect(fileKindOf("application/pdf", "report").ext).toBe("PDF");
		expect(fileKindOf("application/x-unknown", "blob").ext).toBe("FILE");
	});
});
