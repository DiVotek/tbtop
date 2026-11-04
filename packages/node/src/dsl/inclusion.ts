/** A builder that can be dropped from the wire by `when()` (HasWhen.php). */
export interface Includable {
	isIncluded(): boolean;
}

/** True unless the child carries a when() that resolved false. */
export function isConditionMet(child: unknown): boolean {
	const candidate = child as Partial<Includable> | null;
	return typeof candidate?.isIncluded !== "function" || candidate.isIncluded();
}

/**
 * The when() state a mutable builder holds. The closure runs once per builder:
 * one page assembly consults the verdict several times.
 */
export class WhenGate {
	private condition: boolean | (() => unknown) = true;
	private resolved: boolean | null = null;

	set(condition: boolean | (() => unknown)): void {
		this.condition = condition;
		this.resolved = null;
	}

	clone(): WhenGate {
		const copy = new WhenGate();
		copy.condition = this.condition;
		copy.resolved = this.resolved;
		return copy;
	}

	isIncluded(): boolean {
		if (this.resolved === null) {
			this.resolved =
				typeof this.condition === "function" ? Boolean(this.condition()) : this.condition;
		}
		return this.resolved;
	}
}
