/**
 * Storage keys are `tbtop:<path>` — the colon marks the package namespace so
 * consumer keys never collide, dots express hierarchy inside it.
 */
export function storageKey(...path: string[]): string {
	return `tbtop:${path.join(".")}`;
}
