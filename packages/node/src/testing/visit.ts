import type { PageDef } from "../server/page";
import { fail } from "./assert";
import type { Client, TestResponse } from "./client";
import type { RecordRef } from "./records";
import * as wire from "./wire";

/** The endpoint names url() takes, to their path segment. */
export const ENDPOINT_SEGMENTS: Record<string, string> = {
	form: "forms",
	action: "actions",
	table: "tables",
	data: "data",
	selectCreate: "select-create",
	selectOptions: "select-options",
	daterangeRanges: "daterange-ranges",
	liveRegion: "live-region",
	relationSearch: "relation-search",
	relationCreate: "relation-create",
	upload: "uploads",
	cell: "cells",
};

export type Bag = Record<string, unknown>;
export type Params = Record<string, string | number | RecordRef>;

export const bag = (v: unknown): Bag =>
	v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Bag) : {};

/** `posts/$post/edit` with `{ post: 7 }` → `/admin/posts/7/edit`. */
export function pageUrl(prefix: string, page: PageDef, params: Params): string {
	const segments = page.path
		.split("/")
		.filter(Boolean)
		.map((segment) =>
			segment.startsWith("$") ? param(page, params, segment.slice(1)) : segment,
		);
	return `${prefix.replace(/\/+$/, "")}/${segments.join("/")}`;
}

function param(page: PageDef, params: Params, name: string): string {
	const value = params[name] ?? fail(`Page [${page.path}] needs the [${name}] param.`);
	const raw = typeof value === "object" ? (value._key ?? value.id) : value;
	return encodeURIComponent(String(raw));
}

export interface VisitInit {
	http: Client;
	page: PageDef;
	url: string;
	response: TestResponse;
}

/** One page visit and what every tester on it shares: the client, the props, the endpoints. */
export class PageVisit {
	readonly http: Client;
	readonly page: PageDef;
	readonly url: string;
	readonly response: TestResponse;

	constructor(init: VisitInit) {
		({ http: this.http, page: this.page, url: this.url, response: this.response } = init);
	}

	get rendered(): boolean {
		return this.response.status === 200;
	}

	endpoint(endpoint: string, name?: string): string {
		const segment =
			ENDPOINT_SEGMENTS[endpoint] ??
			fail(
				`Unknown endpoint [${endpoint}]. Known: ${Object.keys(ENDPOINT_SEGMENTS).join(", ")}.`,
			);
		const base = `${this.url.replace(/\/+$/, "")}/${segment}`;
		return name === undefined ? base : `${base}/${encodeURIComponent(name)}`;
	}

	props(): Bag {
		if (!this.rendered) {
			fail(
				`Page [${this.page.path}] responded ${this.response.status}, so it has no structure to check.`,
			);
		}
		return bag(bag(this.response.json).props);
	}

	trees(): unknown[] {
		const props = this.props();
		return [props.structure ?? {}, props.headerActions ?? []];
	}

	record(form: string | null): Bag {
		return form === null ? {} : structuredClone(bag(bag(this.props().data)[form]));
	}

	labels(form: string | null): Record<string, string> {
		if (form === null || !this.rendered) {
			return {};
		}
		const labels: Record<string, string> = {};
		for (const { node, form: owner } of wire.fields(this.trees())) {
			const label = node.options?.label;
			if (owner === form && typeof label === "string" && node.name !== undefined) {
				labels[node.name] = label;
			}
		}
		return labels;
	}

	fieldNames(form: string): string[] {
		const entries = wire.fields(this.trees()).filter((e) => e.form === form);
		return [...new Set(entries.map((e) => e.node.name ?? ""))];
	}

	action(name: string, tree?: unknown): wire.Entry {
		if (!this.rendered) {
			return blind("action", name);
		}
		const scope = tree ?? this.trees();
		const found = wire.named(scope, "action", name)[0];
		return found ?? fail(this.missing("Action", name, wire.ofKind(scope, "action")));
	}

	field(name: string): wire.Entry {
		// A page form's field wins over a modal form's field of the same name.
		const all = wire.fields(this.trees(), name);
		const found = all.find((e) => e.modal === null) ?? all[0];
		return found ?? fail(this.missing("Field", name, wire.fields(this.trees())));
	}

	missing(what: string, name: string, present: wire.Entry[]): string {
		const plural = `${what.toLowerCase()}s`;
		return `${what} [${name}] is not on page [${this.page.path}]: hidden, excluded or unknown. On the page: ${plural} ${wire.nameList(present)}.`;
	}
}

/** A stand-in for a node of a page that did not render: calls go out blind. */
export function blind(kind: string, name: string): wire.Entry {
	const spec = { type: "server", needs: ["form", "row", "selection"] };
	const options = kind === "action" ? { spec } : {};
	return { node: { kind, name, options, meta: {} }, form: null, modal: null };
}
