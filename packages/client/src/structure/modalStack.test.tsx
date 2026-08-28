import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { useEffect } from "react";
import { type ModalStack, ModalStackProvider, useModalStack } from "./modalStack";

describe("ModalStack", () => {
	test("two closeTop calls in one synchronous batch close two distinct modals, not the same one twice", () => {
		const closed: string[] = [];
		let stack: ModalStack | undefined;
		function Harness() {
			stack = useModalStack();
			useEffect(() => {
				stack?.push(() => closed.push("a"));
				stack?.push(() => closed.push("b"));
			}, []);
			return null;
		}
		render(
			<ModalStackProvider>
				<Harness />
			</ModalStackProvider>,
		);

		// Simulates executeFlashEffects running two closeModal effects from one
		// flash payload synchronously: each closeTop() must act on a fresh top,
		// not the same still-registered entry twice.
		expect(stack?.closeTop()).toBe(true);
		expect(stack?.closeTop()).toBe(true);
		expect(closed).toEqual(["b", "a"]);
		expect(stack?.closeTop()).toBe(false);
	});

	test("unregister removes only its own entry, even when another entry shares the same callback", () => {
		const closed: string[] = [];
		let stack: ModalStack | undefined;
		let unregisterFirst: (() => void) | undefined;
		function Harness() {
			stack = useModalStack();
			useEffect(() => {
				const close = () => closed.push("shared-shape");
				unregisterFirst = stack?.push(close);
				stack?.push(close);
			}, []);
			return null;
		}
		render(
			<ModalStackProvider>
				<Harness />
			</ModalStackProvider>,
		);

		unregisterFirst?.();
		expect(stack?.closeTop()).toBe(true);
		expect(closed).toEqual(["shared-shape"]);
		expect(stack?.closeTop()).toBe(false);
	});
});
