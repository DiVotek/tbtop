const MIN_POLL_SECONDS = 5;

/**
 * Server-declared poll interval (seconds) → setInterval milliseconds.
 * Clamps to a 5s minimum; null (polling off) for absent/invalid values.
 */
export function pollIntervalMs(seconds: number | undefined): number | null {
	if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
		return null;
	}
	return Math.max(seconds, MIN_POLL_SECONDS) * 1000;
}
