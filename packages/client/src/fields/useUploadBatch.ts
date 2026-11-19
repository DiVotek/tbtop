import { type MutableRefObject, useCallback, useState } from "react";
import type { UploadTask } from "../media/types";
import {
	exceedsMaxSize,
	runUpload,
	type UploadOptionsBag,
	type UploadValue,
	useUploadDependencies,
} from "./uploadUtils";
import { uploadValues } from "./uploadValues";

interface Input {
	opts: UploadOptionsBag;
	valueRef: MutableRefObject<UploadValue | UploadValue[] | string | string[] | null>;
	onChange: (value: UploadValue[]) => void;
	prepare: (file: File) => Promise<File | undefined>;
}

export function useUploadBatch({ opts, valueRef, onChange, prepare }: Input) {
	const { t, ctx, client } = useUploadDependencies();
	const [tasks, setTasks] = useState<UploadTask[]>([]);
	const [error, setError] = useState<string | null>(null);
	const uploadOne = async (picked: File, task: UploadTask) => {
		const patch = (value: Partial<UploadTask>) =>
			setTasks((current) =>
				current.map((item) => (item.id === task.id ? { ...item, ...value } : item)),
			);
		try {
			const file = await prepare(picked);
			if (!file) {
				setTasks((current) => current.filter((item) => item.id !== task.id));
				return;
			}
			if (exceedsMaxSize(opts, file)) {
				throw new Error(t("field.upload.tooLarge"));
			}
			patch({ status: "uploading", pct: 0 });
			const row = await runUpload({ opts, ctx, client, file });
			patch({ status: "done", pct: 100 });
			const next = [...uploadValues(valueRef.current), row];
			valueRef.current = next;
			onChange(next);
		} catch (err) {
			patch({ status: "error" });
			setError(err instanceof Error ? err.message : String(err));
		}
	};
	return { tasks, error, uploadOne, setTasks, setError };
}

export function useUploadFiles(input: Input) {
	const batch = useUploadBatch(input);
	const { opts, valueRef } = input;
	const uploadFiles = useCallback(
		async (files: File[]) => {
			if (files.length === 0) {
				return;
			}
			batch.setError(null);
			const remaining = opts.maxFiles
				? opts.maxFiles - uploadValues(valueRef.current).length
				: files.length;
			const selected = files.slice(0, Math.max(0, remaining));
			const stamp = Date.now();
			const tasks: UploadTask[] = selected.map((file, i) => ({
				id: `${stamp}-${i}-${file.name}`,
				name: file.name,
				status: "pending",
				pct: 0,
			}));
			batch.setTasks((current) => [...current, ...tasks]);
			for (const [index, file] of selected.entries()) {
				const task = tasks[index];
				if (task) {
					await batch.uploadOne(file, task);
				}
			}
		},
		[opts, valueRef, batch],
	);
	return { tasks: batch.tasks, error: batch.error, uploadFiles };
}
