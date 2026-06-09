import { describe, expect, test } from "bun:test";
import { act, render } from "@testing-library/react";
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

	test("FormController changedFields includes both edited keys regardless of order", () => {
		const captures = mount({ title: "Hello", body: "World" });
		act(() => last(captures).set("title", "Hi"));
		act(() => last(captures).set("body", "Earth"));
		expect(new Set(last(captures).changedFields)).toEqual(new Set(["title", "body"]));
	});
});
