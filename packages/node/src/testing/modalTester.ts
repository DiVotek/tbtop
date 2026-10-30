import { dataGet, dataSet } from "../server/validation/data";
import { check, fail, looseEqual, show } from "./assert";
import { postAction, runAction } from "./calls";
import type { TestResponse } from "./client";
import { FormTester } from "./formTester";
import type { Result } from "./result";
import type { Bag, PageVisit } from "./visit";
import * as wire from "./wire";

export interface OpenedModal {
	name: string;
	body: unknown;
	form: string | null;
	data: Bag;
	row: Bag;
	selection: unknown[];
	response: TestResponse | null;
}

/** An opened modal action: the data its query() loaded, then a submit through one of its actions. */
export class ModalTester {
	constructor(
		private readonly visit: PageVisit,
		private readonly modal: OpenedModal,
	) {}

	/** The query() response, when the modal has one. */
	response(): TestResponse | null {
		return this.modal.response;
	}

	/** The query() was refused: 403 from the page gate or authorize(). */
	assertForbidden(): this {
		const { response, name } = this.modal;
		check(response !== null, `Modal [${name}] has no query() to refuse.`);
		check(
			response?.status === 403,
			`Modal [${name}] query() responded ${response?.status}, expected 403.`,
		);
		return this;
	}

	/** The modal opens with these values; dotted keys reach nested ones. */
	assertFormData(expected: Bag): this {
		for (const [key, value] of Object.entries(expected)) {
			const got = dataGet(this.modal.data, key);
			check(
				looseEqual(got, value),
				`Modal [${this.modal.name}] opens with a different [${key}]: ${show(got)}. Data: ${show(this.modal.data)}`,
			);
		}
		return this;
	}

	/** Set form values over what the modal opened with. */
	fill(data: Bag): this {
		for (const [key, value] of Object.entries(data)) {
			dataSet(this.modal.data, key, value);
		}
		return this;
	}

	/** Submit through the modal's one action that takes its form. */
	submit(): Promise<Result> {
		const actions = wire.ofKind([this.modal.body], "action").filter((e) => {
			const spec = wire.spec(e.node);
			return (spec.needs ?? []).includes("form") || spec.type === "submit";
		});
		const [only] = actions;
		if (only === undefined || actions.length > 1) {
			fail(
				`Modal [${this.modal.name}] has ${actions.length} actions that submit its form (${wire.nameList(actions)}); call one with callAction().`,
			);
		}
		return this.run(only);
	}

	/** Run one of the modal's actions by name. */
	callAction(name: string): Promise<Result> {
		return this.run(this.visit.action(name, this.modal.body));
	}

	private run(entry: wire.Entry): Promise<Result> {
		const spec = wire.spec(entry.node);
		const { data, row, selection, form } = this.modal;
		if (spec.type === "submit") {
			return new FormTester(this.visit, spec.form ?? form ?? "", data).submit();
		}
		const call = { form: data, row, selection };
		if (spec.type !== "server") {
			return runAction(this.visit, entry, call);
		}
		return postAction(
			this.visit,
			{ name: entry.node.name ?? "", needs: spec.needs ?? [], form },
			call,
		);
	}
}
