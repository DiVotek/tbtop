import { check, fail, looseEqual, show } from "./assert";
import type { TestResponse } from "./client";
import { ruleMessages } from "./ruleMessages";

export type Effect = { kind?: string; [field: string]: unknown };

export interface ResultInit {
	response: TestResponse;
	effects: Effect[];
	errors: Record<string, string[]>;
	subject: string;
	/** field name → the label the error messages use */
	labels?: Record<string, string>;
	redirect?: string | null;
}

/**
 * The outcome of a form submit or an action call. Both transports — a form's
 * Inertia redirect with flashed effects and session errors, an action's JSON
 * `{effects}` and 422 — land in the same assertions.
 */
export class Result {
	constructor(private readonly init: ResultInit) {}

	/** The raw response, for a check the tester does not cover. */
	response(): TestResponse {
		return this.init.response;
	}

	/**
	 * Validation failed for these fields. A list names fields; a map also
	 * checks the failure: a rule (`"required"`, `"max:200"`) matched by the
	 * message it renders, or the message itself.
	 */
	assertHasErrors(keys: string | string[] | Record<string, string | string[]> = []): this {
		const { errors, subject } = this.init;
		check(Object.keys(errors).length > 0, `${subject} has no validation errors.`);
		const entries = typeof keys === "string" ? [keys] : keys;
		if (Array.isArray(entries)) {
			entries.forEach((field) => this.fieldHasError(field));
			return this;
		}
		for (const [field, expected] of Object.entries(entries)) {
			this.fieldHasError(field);
			for (const one of [expected].flat()) {
				this.errorMatches(field, one);
			}
		}
		return this;
	}

	/** Validation passed — or, given field names, none of these fields failed. */
	assertHasNoErrors(keys: string | string[] = []): this {
		const { errors, subject, response } = this.init;
		check(
			response.status < 500,
			`${subject} failed with ${response.status}: ${response.text.slice(0, 500)}`,
		);
		const fields = [keys].flat();
		if (fields.length === 0) {
			check(
				Object.keys(errors).length === 0,
				`${subject} has validation errors: ${show(errors)}`,
			);
			return this;
		}
		for (const field of fields) {
			check(
				!(field in errors),
				`${subject} has errors on [${field}]: ${show(errors[field])}`,
			);
		}
		return this;
	}

	/** An effect of this kind arrived, its fields including `fields`. */
	assertEffect(kind: string, fields: Record<string, unknown> = {}): this {
		const matches = (e: Effect) =>
			e.kind === kind && Object.entries(fields).every(([k, v]) => looseEqual(e[k], v));
		if (!this.init.effects.some(matches)) {
			fail(
				`${this.init.subject} sent no [${kind}] effect matching ${show(fields)}. Effects: ${show(this.init.effects)}`,
			);
		}
		return this;
	}

	/** No effect of this kind arrived — or, without a kind, no effect at all. */
	assertNoEffects(kind?: string): this {
		const sent = this.init.effects.filter((e) => kind === undefined || e.kind === kind);
		check(sent.length === 0, `${this.init.subject} sent effects: ${show(sent)}`);
		return this;
	}

	/** A toast with this message, at this level when given. */
	assertNotified(message: string, level?: string): this {
		return this.assertEffect("notify", level === undefined ? { message } : { message, level });
	}

	/**
	 * The client is sent elsewhere: a `redirect` effect or an HTTP redirect
	 * other than the form's own way back. Without `url`, any destination.
	 */
	assertRedirect(url?: string): this {
		const targets = [
			this.init.redirect,
			...this.init.effects.map((e) => (e.kind === "redirect" ? e.href : null)),
		].filter((t): t is string => typeof t === "string" && t !== "");
		const { subject } = this.init;
		check(targets.length > 0, `${subject} redirected nowhere.`);
		if (url !== undefined) {
			const want = absolute(url);
			check(
				targets.map(absolute).includes(want),
				`${subject} did not redirect to [${url}]: ${targets.join(", ")}`,
			);
		}
		return this;
	}

	/** A closeModal effect: the modal the call came from closes. */
	assertModalClosed(): this {
		return this.assertEffect("closeModal");
	}

	/** The modal stayed open with a message — haltModal. */
	assertHalted(message?: string): this {
		return this.assertEffect("haltModal", message === undefined ? {} : { message });
	}

	/** A refreshTable effect — for this table when named, else any. */
	assertTableRefreshed(table?: string): this {
		return this.assertEffect("refreshTable", table === undefined ? {} : { table });
	}

	/** 403 from the page gate or an authorize() check. */
	assertForbidden(): this {
		return this.assertStatus(403);
	}

	/** The call went through: a 2xx, or a form's redirect with no validation errors. */
	assertOk(): this {
		const { status } = this.init.response;
		const redirected =
			status >= 300 && status < 400 && Object.keys(this.init.errors).length === 0;
		check(status < 300 || redirected, `${this.init.subject} responded ${status}.`);
		return this;
	}

	/** The call answered this HTTP status — 422 for an action's validation failure. */
	assertStatus(status: number): this {
		const got = this.init.response.status;
		check(got === status, `${this.init.subject} responded ${got}, expected ${status}.`);
		return this;
	}

	/** The effects that arrived, in order. */
	effects(): Effect[] {
		return this.init.effects;
	}

	/** Validation messages per field. */
	errors(): Record<string, string[]> {
		return this.init.errors;
	}

	private fieldHasError(field: string): void {
		const { errors, subject } = this.init;
		check(field in errors, `${subject} has no error on [${field}]. Errors: ${show(errors)}`);
	}

	private errorMatches(field: string, expected: string): void {
		const candidates = [expected, ...ruleMessages(field, expected, this.init.labels?.[field])];
		const messages = this.init.errors[field] ?? [];
		if (!messages.some((m) => candidates.includes(m))) {
			fail(
				`${this.init.subject} error on [${field}] is not [${expected}]: ${show(messages)}`,
			);
		}
	}
}

const absolute = (url: string) => new URL(url, "http://localhost").href;
