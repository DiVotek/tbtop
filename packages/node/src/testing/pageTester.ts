import { dataGet } from "../server/validation/data";
import { check, fail, looseEqual, show } from "./assert";
import { openModal, runAction } from "./calls";
import type { TestResponse } from "./client";
import { FormTester } from "./formTester";
import type { ModalTester } from "./modalTester";
import * as records from "./records";
import type { Result } from "./result";
import { TableTester } from "./tableTester";
import { type Bag, blind, type PageVisit } from "./visit";
import * as wire from "./wire";

export interface CallOptions {
	form?: Bag;
	row?: records.RecordRef | null;
	selection?: Iterable<records.RecordRef>;
}

/**
 * A visited page: assertions on the wire it shipped, and the forms, tables
 * and actions it offers. Calls go through the page's real endpoints.
 */
export class PageTester {
	constructor(private readonly visit: PageVisit) {}

	/** The page visit's raw response. */
	response(): TestResponse {
		return this.visit.response;
	}

	/** The page's URL, or one of its endpoints: `url("action", "publish")`. */
	url(endpoint?: string, name?: string): string {
		return endpoint === undefined ? this.visit.url : this.visit.endpoint(endpoint, name);
	}

	/** The page rendered: 200. */
	assertOk(): this {
		return this.assertStatus(200);
	}

	/** 403 from the page gate (authorize()). */
	assertForbidden(): this {
		return this.assertStatus(403);
	}

	/** The page visit answered this status. */
	assertStatus(status: number): this {
		const got = this.visit.response.status;
		check(
			got === status,
			`Page [${this.visit.page.path}] responded ${got}, expected ${status}.`,
		);
		return this;
	}

	/** The page's title as the header shows it. */
	assertTitle(title: string): this {
		const got = this.visit.props().title;
		check(got === title, `The page title is ${show(got)}, expected ${show(title)}.`);
		return this;
	}

	/** The field is on the wire and not hidden. */
	assertFieldVisible(name: string): this {
		check(this.visit.field(name).node.meta?.hidden !== true, `Field [${name}] is hidden.`);
		return this;
	}

	/** The field is off the wire (when()/authorize()) or hidden(). */
	assertFieldHidden(name: string): this {
		for (const { node } of wire.fields(this.visit.trees(), name)) {
			check(node.meta?.hidden === true, `Field [${name}] is visible.`);
		}
		return this;
	}

	/** The field is on the wire and disabled. */
	assertFieldDisabled(name: string): this {
		check(
			this.visit.field(name).node.meta?.disabled === true,
			`Field [${name}] is not disabled.`,
		);
		return this;
	}

	/** The field is on the wire and not disabled. */
	assertFieldEnabled(name: string): this {
		check(this.visit.field(name).node.meta?.disabled !== true, `Field [${name}] is disabled.`);
		return this;
	}

	/** The form's record() holds this value; dotted names reach nested fields. */
	assertFieldValue(name: string, value: unknown): this {
		const { form } = this.visit.field(name.split(".")[0] ?? name);
		const got = dataGet(this.visit.record(form), name);
		check(
			looseEqual(got, value),
			`Field [${name}] holds ${show(got)}, expected ${show(value)}.`,
		);
		return this;
	}

	/** The action is on the wire and not hidden. */
	assertActionVisible(name: string): this {
		this.visit.props(); // a page that did not render shows no actions
		check(this.visit.action(name).node.meta?.hidden !== true, `Action [${name}] is hidden.`);
		return this;
	}

	/** The action is off the wire (authorize()) or hidden. */
	assertActionHidden(name: string): this {
		for (const { node } of wire.named(this.visit.trees(), "action", name)) {
			check(node.meta?.hidden === true, `Action [${name}] is visible.`);
		}
		return this;
	}

	/** A form on the page; the name is optional when one form sits outside modals. */
	form(name?: string): FormTester {
		if (name !== undefined && !this.visit.rendered) {
			return new FormTester(this.visit, name, {});
		}
		const forms = wire.ofKind(this.visit.trees(), "form").filter((e) => e.modal === null);
		const picked = name ?? (forms.length === 1 ? forms[0]?.node.name : undefined);
		if (picked === undefined) {
			fail(`The page has ${forms.length} forms; name one: ${wire.nameList(forms)}.`);
		}
		if (wire.named(this.visit.trees(), "form", picked).length === 0) {
			fail(this.visit.missing("Form", picked, forms));
		}
		return new FormTester(this.visit, picked, this.visit.record(picked));
	}

	/** A table on the page; the name is optional with one table. */
	table(name?: string): TableTester {
		if (name !== undefined && !this.visit.rendered) {
			return new TableTester(this.visit, name, blind("table", name).node);
		}
		const tables = wire.ofKind(this.visit.trees(), "table");
		const picked = name ?? (tables.length === 1 ? tables[0]?.node.name : undefined);
		if (picked === undefined) {
			fail(`The page has ${tables.length} tables; name one: ${wire.nameList(tables)}.`);
		}
		const found = wire.named(this.visit.trees(), "table", picked)[0];
		return new TableTester(
			this.visit,
			picked,
			(found ?? fail(this.visit.missing("Table", picked, tables))).node,
		);
	}

	/** Fill the page's only form. */
	fill(data: Bag): FormTester {
		return this.form().fill(data);
	}

	/** Run a page action the way its spec says: a server call, a modal opened, filled and submitted, or a form submit. */
	callAction(
		name: string,
		{ form = {}, row = null, selection = [] }: CallOptions = {},
	): Promise<Result> {
		const call = { form, row: records.row(row), selection: records.keys(selection) };
		return runAction(this.visit, this.visit.action(name), call);
	}

	/** Open a modal action: its query() runs, nothing is submitted. */
	openAction(
		name: string,
		{ row = null, selection = [] }: Omit<CallOptions, "form"> = {},
	): Promise<ModalTester> {
		const call = { row: records.row(row), selection: records.keys(selection) };
		return openModal(this.visit, this.visit.action(name).node, call);
	}
}
