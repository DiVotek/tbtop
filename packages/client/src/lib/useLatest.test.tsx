import { describe, expect, it } from "bun:test";
import { act, render } from "@testing-library/react";
import { type LatestRun, useLatest } from "./useLatest";

interface Deferred<T> {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (err: unknown) => void;
}

function deferred<T>(): Deferred<T> {
	let resolve!: (value: T) => void;
	let reject!: (err: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

interface Probe {
	results: string[];
	errors: unknown[];
	start: (promise: Promise<string>) => Promise<void>;
	cancel: () => void;
	unmount: () => void;
}

function mountRunner(): Probe {
	const results: string[] = [];
	const errors: unknown[] = [];
	let run!: LatestRun;
	function Harness() {
		run = useLatest();
		return null;
	}
	const view = render(<Harness />);
	return {
		results,
		errors,
		start: (promise) =>
			run(() => promise, {
				onResult: (value) => results.push(value),
				onError: (err) => errors.push(err),
			}),
		cancel: () => run.cancel(),
		unmount: () => view.unmount(),
	};
}

describe("useLatest", () => {
	it("applies only the newest attempt when an older one resolves last", async () => {
		const probe = mountRunner();
		const first = deferred<string>();
		const second = deferred<string>();

		const a = probe.start(first.promise);
		const b = probe.start(second.promise);

		await act(async () => {
			second.resolve("newest");
			first.resolve("stale");
			await Promise.all([a, b]);
		});

		expect(probe.results).toEqual(["newest"]);
	});

	it("swallows a superseded rejection so it cannot roll back newer state", async () => {
		const probe = mountRunner();
		const first = deferred<string>();
		const second = deferred<string>();

		const a = probe.start(first.promise);
		const b = probe.start(second.promise);

		await act(async () => {
			second.resolve("newest");
			first.reject(new Error("stale failure"));
			await Promise.all([a, b]);
		});

		expect(probe.errors).toEqual([]);
		expect(probe.results).toEqual(["newest"]);
	});

	it("reports the error of the newest attempt", async () => {
		const probe = mountRunner();
		const only = deferred<string>();
		const attempt = probe.start(only.promise);

		await act(async () => {
			only.reject(new Error("boom"));
			await attempt;
		});

		expect((probe.errors[0] as Error).message).toBe("boom");
	});

	it("cancel() supersedes an in-flight attempt without starting one", async () => {
		const probe = mountRunner();
		const pending = deferred<string>();
		const attempt = probe.start(pending.promise);

		probe.cancel();
		await act(async () => {
			pending.resolve("abandoned");
			await attempt;
		});

		expect(probe.results).toEqual([]);
	});

	it("does not settle an attempt that outlives the unmount", async () => {
		const probe = mountRunner();
		const pending = deferred<string>();
		const attempt = probe.start(pending.promise);

		probe.unmount();
		await act(async () => {
			pending.resolve("after unmount");
			await attempt;
		});

		expect(probe.results).toEqual([]);
	});
});
