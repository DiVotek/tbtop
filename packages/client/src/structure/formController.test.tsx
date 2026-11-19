import { describe, expect, test } from "bun:test";
import { act, render } from "@testing-library/react";
import { settleSubmittedForm } from "../inertia/effects";
import { useFormController } from "./formController";

type Handle = ReturnType<typeof useFormController>;

interface ProbeProps {
	initial: Record<string, unknown>;
	onRender: (ctrl: Handle) => void;
}

function Probe({ initial, onRender }: ProbeProps) {
	const ctrl = useFormController({ initial });
	onRender(ctrl);
	return null;
}

function mount(initial: Record<string, unknown>): Handle[] {
	const captures: Handle[] = [];
	render(<Probe initial={initial} onRender={(c) => captures.push(c)} />);
	return captures;
}

function last(captures: Handle[]): Handle {
	const handle = captures[captures.length - 1];
	if (!handle) {
		throw new Error("test probe captured no controller");
	}
	return handle;
}

describe("useFormController", () => {
	test("pending submits preserve a newer nested locale value", () => {
		const captures = mount({ title: { en: "Hello", uk: "Original" } });
		act(() => last(captures).set("title", { en: "Saved", uk: "Original" }));
		const submission = last(captures).beginSubmit?.();
		act(() => last(captures).set("title", { en: "Saved", uk: "Draft" }));
		const record = { title: { en: "Canonical", uk: "Original" } };
		submission?.prepare(record);
		act(() => last(captures).syncInitial(record));
		act(() => submission?.commit(record));
		submission?.finish();
		expect(last(captures).data).toEqual({ title: { en: "Saved", uk: "Draft" } });
		expect(last(captures).initial).toEqual(record);
		expect(last(captures).isDirty).toBe(true);
	});

	test.each([false, true])("submitted secrets clear unless edited while pending (%s)", (edit) => {
		const captures = mount({});
		act(() => last(captures).set("api_key", "submitted"));
		const form = last(captures);
		const submission = form.beginSubmit?.();
		if (edit) {
			act(() => last(captures).set("api_key", "new secret"));
		}
		act(() =>
			settleSubmittedForm(
				form,
				{},
				{
					secretFields: ["api_key"],
					commit: submission?.commit,
				},
			),
		);
		submission?.finish();
		expect(last(captures).data).toEqual(edit ? { api_key: "new secret" } : {});
		expect(last(captures).initial).toEqual({});
	});

	test("explicit resetForm discards edits made while pending", () => {
		const captures = mount({ title: "" });
		act(() => last(captures).set("title", "submitted"));
		const form = last(captures);
		const submission = form.beginSubmit?.();
		act(() => last(captures).set("title", "draft"));
		act(() =>
			settleSubmittedForm(
				form,
				{ "tbtop.effects": [{ kind: "resetForm" }] },
				{
					secretFields: [],
					commit: submission?.commit,
				},
			),
		);
		submission?.finish();
		expect(last(captures).data).toEqual({ title: "" });
		expect(last(captures).isDirty).toBe(false);
	});

	test("finishing without commit preserves edits and releases the submission", () => {
		const captures = mount({ title: "" });
		act(() => last(captures).set("title", "submitted"));
		const submission = last(captures).beginSubmit?.();
		act(() => last(captures).set("title", "draft"));
		submission?.finish();
		expect(last(captures).data).toEqual({ title: "draft" });
		const record = { title: "another record" };
		act(() => last(captures).syncInitial(record));
		expect(last(captures).data).toEqual(record);
	});
	test("FormController initial mirrors the input and isDirty starts false", () => {
		const captures = mount({ title: "Hello", body: "World" });
		const handle = last(captures);
		expect(handle.initial).toEqual({ title: "Hello", body: "World" });
		expect(handle.data).toEqual({ title: "Hello", body: "World" });
		expect(handle.isDirty).toBe(false);
		expect(handle.changedFields).toEqual([]);
	});

	test("FormController set updates data and changedFields", () => {
		const captures = mount({ title: "Hello", body: "World" });
		act(() => last(captures).set("title", "Hi"));
		const handle = last(captures);
		expect(handle.data).toEqual({ title: "Hi", body: "World" });
		expect(handle.initial).toEqual({ title: "Hello", body: "World" });
		expect(handle.isDirty).toBe(true);
		expect(handle.changedFields).toEqual(["title"]);
	});

	test("FormController reset returns data to initial", () => {
		const captures = mount({ title: "Hello" });
		act(() => last(captures).set("title", "Hi"));
		act(() => last(captures).reset());
		const handle = last(captures);
		expect(handle.data).toEqual({ title: "Hello" });
		expect(handle.isDirty).toBe(false);
		expect(handle.changedFields).toEqual([]);
	});

	test("FormController reset can commit saved values as the new baseline", () => {
		const captures = mount({ images: [1, 2] });
		act(() => last(captures).set("images", [2, 1]));
		act(() => last(captures).reset(last(captures).data));

		expect(last(captures).initial).toEqual({ images: [2, 1] });
		expect(last(captures).data).toEqual({ images: [2, 1] });
		expect(last(captures).isDirty).toBe(false);

		act(() => last(captures).set("images", [1, 2]));
		act(() => last(captures).reset());
		expect(last(captures).data).toEqual({ images: [2, 1] });
	});

	test("FormController changedFields includes both edited keys regardless of order", () => {
		const captures = mount({ title: "Hello", body: "World" });
		act(() => last(captures).set("title", "Hi"));
		act(() => last(captures).set("body", "Earth"));
		expect(new Set(last(captures).changedFields)).toEqual(new Set(["title", "body"]));
	});
});
