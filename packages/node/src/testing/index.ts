import type { PageDef } from "../server/page";
import { Client, type TestableAdmin } from "./client";
import { PageTester } from "./pageTester";
import { PageVisit, type Params, pageUrl } from "./visit";

export { TbtopAssertionError } from "./assert";
export type { TestableAdmin, TestResponse } from "./client";
export { FormTester } from "./formTester";
export { ModalTester } from "./modalTester";
export { type CallOptions, PageTester } from "./pageTester";
export type { RecordRef } from "./records";
export { type Effect, Result } from "./result";
export { TableTester } from "./tableTester";

export interface ActingAs {
	/** The user every request acts as; leave it out to test as a guest. */
	as?: unknown;
}

/**
 * The testing API over one panel: `await t.page(EditPost, { post: 2 })`
 * visits a page the way the React client does and returns a PageTester.
 * Every call goes through the panel's real endpoints, so authorize(), the
 * guest gate and validation all run. There is no implicit login.
 */
export function testAdmin(admin: TestableAdmin, defaults: ActingAs = {}) {
	return {
		async page(
			page: PageDef,
			params: Params = {},
			options: ActingAs = {},
		): Promise<PageTester> {
			const http = new Client(admin, "as" in options ? options.as : defaults.as);
			const url = pageUrl(admin.prefix, page, params);
			return new PageTester(
				new PageVisit({ http, page, url, response: await http.visit(url) }),
			);
		},
	};
}
