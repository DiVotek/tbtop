import { describe, expect, mock, test } from "bun:test";
import type { ClientActionContext, ModalController } from "../structure/types";
import { executeEffects } from "./effects";

type EffectCtx = Pick<ClientActionContext, "notify" | "table" | "form" | "modal">;

function fakeCtx(overrides: Partial<EffectCtx> = {}): EffectCtx {
	return {
		notify: () => {},
		...overrides,
	};
}

describe("executeEffects: haltModal", () => {
	test("calls modal.halt with the message and level, does not call modal.close", () => {
		const halt = mock(() => {});
		const close = mock(() => {});
		const modal: ModalController = { close, closeAll: () => {}, halt };
		executeEffects(
			[{ kind: "haltModal", message: "Cannot delete: has children", level: "error" }],
			fakeCtx({ modal }),
		);
		expect(halt).toHaveBeenCalledWith("Cannot delete: has children", "error");
		expect(close).not.toHaveBeenCalled();
	});

	test("is a no-op (does not throw) when the modal controller has no halt method", () => {
		const close = mock(() => {});
		const modal: ModalController = { close, closeAll: () => {} };
		expect(() =>
			executeEffects([{ kind: "haltModal", message: "oops" }], fakeCtx({ modal })),
		).not.toThrow();
	});

	test("is a no-op when there is no surrounding modal at all", () => {
		expect(() =>
			executeEffects([{ kind: "haltModal", message: "oops" }], fakeCtx()),
		).not.toThrow();
	});
});

describe("executeEffects: closeModal contrast", () => {
	test("closeModal calls modal.close, unlike haltModal", () => {
		const halt = mock(() => {});
		const close = mock(() => {});
		const modal: ModalController = { close, closeAll: () => {}, halt };
		executeEffects([{ kind: "closeModal" }], fakeCtx({ modal }));
		expect(close).toHaveBeenCalledTimes(1);
		expect(halt).not.toHaveBeenCalled();
	});
});
