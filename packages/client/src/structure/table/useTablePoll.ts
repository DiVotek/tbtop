import { pollIntervalMs } from "../../lib/pollInterval";
import { usePolling } from "../../lib/usePolling";

interface UseTablePollInput {
	/** Server-declared poll() interval in seconds; absent = no polling. */
	seconds: number | undefined;
	/** Skip ticks while true: a fetch is in flight or rows are selected. */
	paused: boolean;
	poll: () => void;
}

/**
 * Table poll(): refetches rows in the background on the server's interval.
 * A tick is skipped rather than queued while paused — new rows clear the
 * selection, so polling waits until a pending bulk selection is gone.
 * Hidden-tab pausing comes from usePolling.
 */
export function useTablePoll({ seconds, paused, poll }: UseTablePollInput): void {
	usePolling(() => {
		if (!paused) {
			poll();
		}
	}, pollIntervalMs(seconds));
}
