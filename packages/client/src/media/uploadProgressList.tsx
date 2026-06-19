/**
 * UploadProgressList — per-file upload rows (name + Progress bar + status).
 * Rendered above the drop zone so it shows in both grid and list views.
 */
import type { ReactNode } from "react";
import { useTranslation } from "../i18n/i18n";
import { Progress } from "../ui/progress";
import type { UploadTask, UploadTaskStatus } from "./types";

const STATUS_KEY: Record<Exclude<UploadTaskStatus, "pending">, string> = {
	uploading: "media.upload.status_uploading",
	done: "media.upload.status_done",
	error: "media.upload.status_error",
};

function statusKey(status: UploadTaskStatus): string {
	return status === "pending" ? STATUS_KEY.uploading : STATUS_KEY[status];
}

export function UploadProgressList({ tasks }: { tasks: UploadTask[] }): ReactNode {
	const t = useTranslation();
	if (tasks.length === 0) {
		return null;
	}
	return (
		<ul className="flex flex-col gap-2" data-testid="media-upload-progress">
			{tasks.map((task) => (
				<li
					key={task.id}
					className="flex items-center gap-3 text-sm"
					data-testid={`upload-task-${task.id}`}
				>
					<span className="w-40 truncate" title={task.name}>
						{task.name}
					</span>
					<Progress value={task.pct} className="flex-1" />
					<span
						className={
							task.status === "error" ? "text-destructive" : "text-muted-foreground"
						}
						data-testid={`upload-task-status-${task.id}`}
					>
						{t(statusKey(task.status))}
					</span>
				</li>
			))}
		</ul>
	);
}
