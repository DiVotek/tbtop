/**
 * useUploadQueue — sequential per-file upload state for the media grid. Owns the
 * task list, per-file progress, and success/failure toasts. Kept out of the grid
 * component so each function stays a single worker job.
 */
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { type Translate, useTranslation } from "../i18n/i18n";
import { uploadMediaItem } from "./mediaApiHelpers";
import type { MediaItem, UploadTask, UploadTaskStatus } from "./types";
import { useMediaClient } from "./useMediaApi";

interface UseUploadQueueInput {
	folderId: string | null;
	onUploaded: (item: MediaItem) => void;
}

interface UploadQueue {
	tasks: UploadTask[];
	uploading: boolean;
	uploadFiles: (files: FileList | File[]) => Promise<void>;
}

type SetTasks = (updater: (tasks: UploadTask[]) => UploadTask[]) => void;
type MediaClient = ReturnType<typeof useMediaClient>;

function patchTask(id: string, patch: Partial<UploadTask>) {
	return (tasks: UploadTask[]): UploadTask[] =>
		tasks.map((task) => (task.id === id ? { ...task, ...patch } : task));
}

function setStatus(id: string, status: UploadTaskStatus, pct?: number) {
	return patchTask(id, pct === undefined ? { status } : { status, pct });
}

function buildTasks(files: File[]): Array<{ task: UploadTask; file: File }> {
	const stamp = Date.now();
	return files.map((file, i) => ({
		file,
		task: { id: `${stamp}-${i}-${file.name}`, name: file.name, status: "pending", pct: 0 },
	}));
}

interface RunInput {
	client: MediaClient;
	folderId: string | null;
	setTasks: SetTasks;
	onUploaded: (item: MediaItem) => void;
}

async function runUpload(file: File, id: string, deps: RunInput): Promise<boolean> {
	const { client, folderId, setTasks, onUploaded } = deps;
	setTasks(setStatus(id, "uploading", 0));
	try {
		const item = await uploadMediaItem(client, {
			file,
			folderId,
			onProgress: (loaded, total) =>
				setTasks(patchTask(id, { pct: total ? Math.round((loaded / total) * 100) : 0 })),
		});
		setTasks(setStatus(id, "done", 100));
		onUploaded(item);
		return true;
	} catch {
		setTasks(setStatus(id, "error"));
		return false;
	}
}

function reportResult(t: Translate, failed: number): void {
	toast[failed > 0 ? "error" : "success"](
		failed > 0 ? t("media.upload.failed") : t("media.upload.done"),
	);
}

export function useUploadQueue({ folderId, onUploaded }: UseUploadQueueInput): UploadQueue {
	const t = useTranslation();
	const client = useMediaClient();
	const [tasks, setTasks] = useState<UploadTask[]>([]);

	const uploadFiles = useCallback(
		async (files: FileList | File[]): Promise<void> => {
			const queued = buildTasks(Array.from(files));
			// Append, never replace: a second drop mid-upload must not wipe the
			// in-flight batch's progress rows.
			setTasks((prev) => [...prev, ...queued.map((q) => q.task)]);
			const deps: RunInput = { client, folderId, setTasks, onUploaded };
			let failed = 0;
			for (const { file, task } of queued) {
				if (!(await runUpload(file, task.id, deps))) {
					failed++;
				}
			}
			reportResult(t, failed);
		},
		[client, folderId, onUploaded, t],
	);

	const uploading = tasks.some(
		(task) => task.status === "uploading" || task.status === "pending",
	);
	return { tasks, uploading, uploadFiles };
}
