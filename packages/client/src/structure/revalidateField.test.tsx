import { describe, expect, test } from "bun:test";
import { act, render } from "@testing-library/react";
import type { Translate } from "../i18n/i18n";
import { revalidateField } from "./formBlock";
import { useFormController } from "./formController";

type Handle = ReturnType<typeof useFormController>;

// Consumer-authored schemas (like makeSchema() below) throw plain-English
// messages, not validation.* keys — translateValidationMessage falls back to
// the message itself for unrecognized keys, so an identity stub is enough.
const t: Translate = (key, fallback) => fallback ?? key;

function makeSchema() {
	return {
		parse(input: unknown) {
			const data = input as { title?: string; body?: string };
			const issues: { path: string[]; message: string }[] = [];
			if (!data.title || data.title.length < 3) {
				issues.push({ path: ["title"], message: "title too short" });
			}
			if (!data.body || data.body.length < 3) {
				issues.push({ path: ["body"], message: "body too short" });
			}
			if (issues.length > 0) {
				const err = new Error("validation failed") as Error & { issues: typeof issues };
				err.issues = issues;
				throw err;
			}
			return input;
		},
	};
}

function mount(): Handle[] {
	const captures: Handle[] = [];
	function Probe() {
		const ctrl = useFormController({
			initial: { title: "ab", body: "xy" },
			schema: makeSchema(),
		});
		captures.push(ctrl);
		return null;
	}
	render(<Probe />);
	return captures;
}

function last(captures: Handle[]): Handle {
	const handle = captures[captures.length - 1];
	if (!handle) {
		throw new Error("probe captured no controller");
	}
	return handle;
}

describe("revalidateField", () => {
	test("clears stale title error when current value valid and only other fields fail", () => {
		const captures = mount();
		act(() => {
			last(captures).setFieldError("title", "title too short");
			last(captures).setFieldError("body", "body too short");
		});
		act(() => last(captures).set("title", "long enough"));
		act(() => revalidateField(last(captures), "title", t));
		expect(last(captures).fieldErrors.title).toBeUndefined();
		expect(last(captures).fieldErrors.body).toBe("body too short");
	});

	test("keeps title error and surfaces current message when title still fails", () => {
		const captures = mount();
		act(() => last(captures).set("title", "x"));
		act(() => revalidateField(last(captures), "title", t));
		expect(last(captures).fieldErrors.title).toBe("title too short");
	});

	test("noop when field is not in changedFields", () => {
		const captures = mount();
		act(() => last(captures).setFieldError("title", "stale"));
		act(() => revalidateField(last(captures), "title", t));
		expect(last(captures).fieldErrors.title).toBe("stale");
	});
});
