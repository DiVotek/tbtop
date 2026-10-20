import { afterEach, describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { usePolling } from "./usePolling";

function setHidden(hidden: boolean): void {
	Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
}

function Poller({ fn, ms }: { fn: () => void; ms: number }) {
	usePolling(fn, ms);
	return null;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

afterEach(() => setHidden(false));

describe("usePolling", () => {
	// Regression: a component mounted in a background tab polled while hidden.
	test("does not poll when mounted in a hidden tab, resumes on visibility", async () => {
		setHidden(true);
		let calls = 0;
		const { unmount } = render(<Poller fn={() => calls++} ms={10} />);
		await wait(50);
		expect(calls).toBe(0);

		setHidden(false);
		document.dispatchEvent(new Event("visibilitychange"));
		expect(calls).toBe(1);
		await wait(50);
		expect(calls).toBeGreaterThan(1);
		unmount();
	});
});
