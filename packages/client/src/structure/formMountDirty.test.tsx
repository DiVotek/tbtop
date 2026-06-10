/**
 * Regression: a freshly mounted form with an untouched record must be clean.
 *
 * Symptom (demo): open post edit via row click, edit nothing — the unsaved
 * guard still warns. Some field control writes a normalized value back into
 * the controller during mount, making changedFields non-empty.
 *
 * The record below mirrors the demo post wire shape (int FKs, translatable
 * locale maps, ISO timestamps, repeater rows) and the field set mirrors
 * PostFormFields. The assertion prints the offending fields on failure.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { clearBlockRegistry } from "../render/blockRegistry";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";
import type { FormController, StructureNode } from "./types";

const RECORD = {
	id: 1,
	title: { en: "Hello", uk: "Привіт" },
	intro: { en: null, uk: null },
	slug: "hello",
	body: { en: "<p>Body text</p>", uk: null },
	published: true,
	published_at: "2026-06-01T00:00:00.000000Z",
	rating: 4.5,
	cover_media_id: null,
	author_id: 1,
	sections: [{ heading: "H1", body: "B1", type: "text", url: null }],
	created_at: "2026-06-01T00:00:00.000000Z",
	updated_at: "2026-06-01T00:00:00.000000Z",
};

function field(kind: string, name: string, options: Record<string, unknown> = {}): StructureNode {
	return { kind, name, options: { name, ...options }, meta: {} } as StructureNode;
}

const AUTHOR_OPTIONS = [{ value: "1", label: "Alice" }];
const SECTION_FIELDS = [
	field("text", "heading", { label: "Heading" }),
	field("textarea", "body", { label: "Body" }),
	field("select", "type", {
		options: [
			{ value: "text", label: "Text" },
			{ value: "link", label: "Link" },
		],
	}),
	field("text", "url", { label: "URL" }),
];

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

afterEach(() => {
	clearBlockRegistry();
});

describe("Form mount cleanliness", () => {
	test("mounting the post edit form does not dirty any field", async () => {
		let probed: Pick<FormController, "isDirty" | "changedFields" | "data" | "initial"> | null =
			null;

		const node = s.form({ query: async () => RECORD, guardUnsaved: true }, [
			field("text", "title", { label: "Title", translatable: true }),
			field("text", "intro", { label: "Intro", translatable: true }),
			field("slug", "slug", { label: "Slug", fromField: "title" }),
			// richtext excluded: lexical does not mount under bun/happy-dom.
			// Its mount-writeback is covered by the OnChangePlugin filter fix.
			field("boolean", "published", { label: "Published" }),
			field("date", "published_at", { label: "Published at" }),
			field("media", "cover_media_id", { label: "Cover image" }),
			field("select", "author_id", {
				label: "Author",
				options: AUTHOR_OPTIONS,
				searchable: true,
			}),
			field("repeater", "sections", { label: "Sections", fields: SECTION_FIELDS }),
			s.action({
				name: "probe",
				handler: async (c) => {
					const form = c.form as FormController | undefined;
					probed = form
						? {
								isDirty: form.isDirty,
								changedFields: form.changedFields,
								data: form.data,
								initial: form.initial,
							}
						: null;
				},
			}),
		]);

		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		// Wait for the form (async query) and the lazy richtext editor to settle.
		const probeBtn = await findByTestId("action-probe");
		await waitFor(() => {}, { timeout: 2000 });
		await act(async () => {
			await new Promise((r) => setTimeout(r, 50));
		});

		await act(async () => {
			fireEvent.click(probeBtn);
		});

		expect(probed).not.toBeNull();
		const snapshot = probed as unknown as Pick<
			FormController,
			"isDirty" | "changedFields" | "data" | "initial"
		>;
		const diff = Object.fromEntries(
			snapshot.changedFields.map((f) => [
				f,
				{ initial: snapshot.initial[f], current: snapshot.data[f] },
			]),
		);
		expect(diff).toEqual({});
		expect(snapshot.isDirty).toBe(false);
	});
});
