import { dataSet } from "../server/validation/data";
import { fail } from "./assert";
import { runAction, submitForm } from "./calls";
import type { Result } from "./result";
import type { Bag, PageVisit } from "./visit";
import * as wire from "./wire";

/** One form on the page: fill over its record, then submit or call one of its actions. */
export class FormTester {
	constructor(
		private readonly visit: PageVisit,
		private readonly name: string,
		private readonly data: Bag,
	) {}

	/** Set field values over the prefilled record; dotted keys reach nested fields. */
	fill(data: Bag): this {
		// A page that did not render has no fields to check against: post blind.
		const fields = this.visit.rendered ? this.visit.fieldNames(this.name) : null;
		for (const [key, value] of Object.entries(data)) {
			const root = key.split(".")[0] ?? key;
			if (fields !== null && !fields.includes(root) && !(root in this.data)) {
				fail(
					`Form [${this.name}] has no field [${root}]. Fields: ${fields.length === 0 ? "none" : fields.join(", ")}.`,
				);
			}
			dataSet(this.data, key, value);
		}
		return this;
	}

	/** Post the form to its submit handler. */
	submit(): Promise<Result> {
		return submitForm(this.visit, this.name, this.data);
	}

	/** Run an action inside the form with the filled values. */
	callAction(name: string): Promise<Result> {
		const form = wire.named(this.visit.rendered ? this.visit.trees() : [], "form", this.name)[0]
			?.node;
		return runAction(this.visit, this.visit.action(name, form), {
			form: this.data,
			row: {},
			selection: [],
		});
	}
}
