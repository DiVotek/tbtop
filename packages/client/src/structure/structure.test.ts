import { describe, expect, test } from "bun:test";
import { s } from "./structure";

const HIDDEN = () => false;

describe("structure layout builders", () => {
	test("structure stack splits meta and stores children under options", () => {
		const child = s.text({ name: "title" });
		const node = s.stack([child], { gap: 4, id: "main" });
		expect(node).toEqual({
			kind: "stack",
			options: { gap: 4, children: [child] },
			meta: { id: "main" },
		});
	});

	test("structure row mirrors stack with kind row", () => {
		const child = s.text({ name: "title" });
		const node = s.row([child], { gap: 2 });
		expect(node).toEqual({
			kind: "row",
			options: { gap: 2, children: [child] },
			meta: {},
		});
	});

	test("structure grid splits cols into options and hidden into meta", () => {
		const child = s.text({ name: "title" });
		const node = s.grid({ cols: 3, id: "g", hidden: HIDDEN }, [child]);
		expect(node).toEqual({
			kind: "grid",
			options: { cols: 3, children: [child] },
			meta: { id: "g", hidden: HIDDEN },
		});
	});

	test("structure section puts title in options and id in meta", () => {
		const child = s.text({ name: "title" });
		const node = s.section({ title: "Profile", id: "s1" }, [child]);
		expect(node).toEqual({
			kind: "section",
			options: { title: "Profile", children: [child] },
			meta: { id: "s1" },
		});
	});

	test("structure tabs stores items under options.tabs", () => {
		const body1 = s.text({ name: "a" });
		const body2 = s.text({ name: "b" });
		const node = s.tabs([s.tab("General", body1), s.tab("Advanced", body2)], { id: "t" });
		expect(node).toEqual({
			kind: "tabs",
			options: {
				tabs: [
					{ label: "General", body: body1 },
					{ label: "Advanced", body: body2 },
				],
			},
			meta: { id: "t" },
		});
	});

	test("structure tab returns label and body item", () => {
		const body = s.text({ name: "x" });
		expect(s.tab("First", body)).toEqual({ label: "First", body });
	});
});

describe("structure field builders", () => {
	test("structure text mirrors name to top-level and splits hidden into meta", () => {
		const node = s.text({
			name: "title",
			label: "Title",
			required: true,
			maxLength: 200,
			hidden: HIDDEN,
		});
		expect(node).toEqual({
			kind: "text",
			name: "title",
			options: { label: "Title", required: true, maxLength: 200 },
			meta: { hidden: HIDDEN },
		});
	});

	test("structure number carries min/max/step in options", () => {
		const node = s.number({ name: "age", min: 0, max: 120, step: 1 });
		expect(node).toEqual({
			kind: "number",
			name: "age",
			options: { min: 0, max: 120, step: 1 },
			meta: {},
		});
	});

	test("structure date carries format in options", () => {
		expect(s.date({ name: "publishedAt", format: "YYYY-MM-DD" })).toEqual({
			kind: "date",
			name: "publishedAt",
			options: { format: "YYYY-MM-DD" },
			meta: {},
		});
	});

	test("structure datetime splits id+hidden into meta and keeps rest in options", () => {
		const node = s.datetime({
			name: "publishedAt",
			label: "Published at",
			required: true,
			placeholder: "Pick a date and time",
			id: "p",
			hidden: HIDDEN,
		});
		expect(node).toEqual({
			kind: "datetime",
			name: "publishedAt",
			options: {
				label: "Published at",
				required: true,
				placeholder: "Pick a date and time",
			},
			meta: { id: "p", hidden: HIDDEN },
		});
	});

	test("structure date no longer accepts a mode option", () => {
		// @ts-expect-error — mode is not a recognized option on s.date (use s.datetime)
		s.date({ name: "publishedAt", mode: "datetime" });
	});

	test("structure boolean carries no extra options", () => {
		expect(s.boolean({ name: "isPublished" })).toEqual({
			kind: "boolean",
			name: "isPublished",
			options: {},
			meta: {},
		});
	});

	test("structure select static mode carries the choice list under options", () => {
		const choices = [
			{ value: "draft", label: "Draft" },
			{ value: "published", label: "Published" },
		];
		expect(s.select({ name: "status", options: choices })).toEqual({
			kind: "select",
			name: "status",
			options: { options: choices },
			meta: {},
		});
	});

	test("structure select multi flag lands in options", () => {
		const choices = [{ value: "a", label: "A" }];
		expect(s.select({ name: "tags", options: choices, multiple: true })).toEqual({
			kind: "select",
			name: "tags",
			options: { options: choices, multiple: true },
			meta: {},
		});
	});

	test("structure select async mode carries query and option mappers under options", () => {
		const query = async (): Promise<{ id: string; name: string }[]> => [];
		const optionLabel = (r: { id: string; name: string }) => r.name;
		const optionValue = (r: { id: string; name: string }) => r.id;
		expect(s.select({ name: "authorId", query, optionLabel, optionValue, id: "a" })).toEqual({
			kind: "select",
			name: "authorId",
			options: { query, optionLabel, optionValue },
			meta: { id: "a" },
		});
	});

	test("structure radio carries options list and splits meta", () => {
		const choices = [
			{ value: "free", label: "Free" },
			{ value: "pro", label: "Pro" },
		];
		expect(s.radio({ name: "plan", options: choices, id: "p", hidden: HIDDEN })).toEqual({
			kind: "radio",
			name: "plan",
			options: { options: choices },
			meta: { id: "p", hidden: HIDDEN },
		});
	});

	test("structure tags closed-enum carries options list", () => {
		const choices = [{ value: "bug", label: "Bug" }];
		expect(s.tags({ name: "labels", options: choices })).toEqual({
			kind: "tags",
			name: "labels",
			options: { options: choices },
			meta: {},
		});
	});

	test("structure tags open-ended has no options key in options bag", () => {
		expect(s.tags({ name: "labels" })).toEqual({
			kind: "tags",
			name: "labels",
			options: {},
			meta: {},
		});
	});

	test("structure tags async mode carries query and option mappers", () => {
		const query = async (): Promise<{ id: string; name: string }[]> => [];
		const optionLabel = (r: { id: string; name: string }) => r.name;
		const optionValue = (r: { id: string; name: string }) => r.id;
		expect(s.tags({ name: "authorIds", query, optionLabel, optionValue })).toEqual({
			kind: "tags",
			name: "authorIds",
			options: { query, optionLabel, optionValue },
			meta: {},
		});
	});

	test("structure checkbox carries label in options", () => {
		expect(s.checkbox({ name: "agree", label: "I agree" })).toEqual({
			kind: "checkbox",
			name: "agree",
			options: { label: "I agree" },
			meta: {},
		});
	});

	test("structure relation carries to in options", () => {
		expect(s.relation({ name: "authorId", to: "users" })).toEqual({
			kind: "relation",
			name: "authorId",
			options: { to: "users" },
			meta: {},
		});
	});

	test("structure textarea carries rows and autoresize in options and splits meta", () => {
		const node = s.textarea({
			name: "body",
			rows: 6,
			autoresize: true,
			placeholder: "Write…",
			id: "b",
			hidden: HIDDEN,
		});
		expect(node).toEqual({
			kind: "textarea",
			name: "body",
			options: { rows: 6, autoresize: true, placeholder: "Write…" },
			meta: { id: "b", hidden: HIDDEN },
		});
	});

	test("structure password carries autoComplete in options", () => {
		const node = s.password({ name: "password", autoComplete: "current-password" });
		expect(node).toEqual({
			kind: "password",
			name: "password",
			options: { autoComplete: "current-password" },
			meta: {},
		});
	});

	test("structure colorpicker carries palette in options", () => {
		const node = s.colorpicker({
			name: "brand",
			palette: ["#ff0000", "#00ff00", "#0000ff"],
		});
		expect(node).toEqual({
			kind: "colorpicker",
			name: "brand",
			options: { palette: ["#ff0000", "#00ff00", "#0000ff"] },
			meta: {},
		});
	});

	test("structure colorpicker splits id and hidden into meta", () => {
		const node = s.colorpicker({
			name: "brand",
			label: "Brand color",
			palette: ["#fff"],
			id: "c",
			hidden: HIDDEN,
		});
		expect(node).toEqual({
			kind: "colorpicker",
			name: "brand",
			options: { label: "Brand color", palette: ["#fff"] },
			meta: { id: "c", hidden: HIDDEN },
		});
	});

	test("structure keyvalue carries label and required in options", () => {
		const node = s.keyvalue({ name: "meta", label: "Metadata", required: true });
		expect(node).toEqual({
			kind: "keyvalue",
			name: "meta",
			options: { label: "Metadata", required: true },
			meta: {},
		});
	});

	test("structure keyvalue splits id and hidden into meta", () => {
		const node = s.keyvalue({ name: "meta", id: "kv1", hidden: HIDDEN });
		expect(node).toEqual({
			kind: "keyvalue",
			name: "meta",
			options: {},
			meta: { id: "kv1", hidden: HIDDEN },
		});
	});
	test("structure slug carries fromField in options", () => {
		const node = s.slug({ name: "slug", fromField: "title" });
		expect(node).toEqual({
			kind: "slug",
			name: "slug",
			options: { fromField: "title" },
			meta: {},
		});
	});

	test("structure slug splits id and hidden into meta", () => {
		const node = s.slug({
			name: "slug",
			fromField: "title",
			label: "URL",
			id: "sl",
			hidden: HIDDEN,
		});
		expect(node).toEqual({
			kind: "slug",
			name: "slug",
			options: { fromField: "title", label: "URL" },
			meta: { id: "sl", hidden: HIDDEN },
		});
	});

	test("structure upload carries entity and accept in options", () => {
		const node = s.upload({
			name: "file",
			entity: "media",
			accept: "image/*",
			maxFileSize: 1024,
		});
		expect(node).toEqual({
			kind: "upload",
			name: "file",
			options: { entity: "media", accept: "image/*", maxFileSize: 1024 },
			meta: {},
		});
	});

	test("structure upload splits id and hidden into meta", () => {
		const node = s.upload({
			name: "file",
			entity: "media",
			label: "Image",
			id: "u",
			hidden: HIDDEN,
		});
		expect(node).toEqual({
			kind: "upload",
			name: "file",
			options: { entity: "media", label: "Image" },
			meta: { id: "u", hidden: HIDDEN },
		});
	});
});

describe("structure action builders", () => {
	test("structure action with handler builds an action node", () => {
		const handler = async () => {};
		const node = s.action({ name: "save", label: "Save", color: "primary", handler });
		expect(node).toEqual({
			kind: "action",
			name: "save",
			options: { label: "Save", color: "primary", handler },
			meta: {},
		});
	});

	test("structure action with url resolver stores function under options.url", () => {
		const url = (c: { params: Record<string, string> }) => `/posts/${c.params.id}/edit`;
		const node = s.action({ name: "edit", label: "Edit", url });
		expect((node.options as { url: unknown }).url).toBe(url);
	});

	test("structure action with both handler and url throws", () => {
		expect(() => s.action({ name: "x", handler: () => {}, url: "/y" } as never)).toThrow(
			'@tbtop/admin: action "x" must have exactly one of `handler`, `url`, or `modal`',
		);
	});

	test("structure action with handler and modal throws", () => {
		expect(() =>
			s.action({
				name: "x",
				handler: () => {},
				modal: { title: "T" },
			} as never),
		).toThrow('@tbtop/admin: action "x" must have exactly one of `handler`, `url`, or `modal`');
	});

	test("structure action with none of handler, url, modal throws", () => {
		expect(() => s.action({ name: "x" } as never)).toThrow(
			'@tbtop/admin: action "x" must have one of `handler`, `url`, or `modal`',
		);
	});

	test("structure action with modal stores resolved body on options.modal", () => {
		const node = s.action({
			name: "delete",
			label: "Delete",
			modal: {
				title: "Delete post?",
				description: "Cannot be undone.",
				body: (sb) => sb.row([sb.action({ name: "cancel", url: "/" })]),
			},
		});
		const modal = (node.options as { modal: { title: string; body: { kind: string } } }).modal;
		expect(modal.title).toBe("Delete post?");
		expect(modal.body.kind).toBe("row");
	});

	test("structure actions is a row of action nodes", () => {
		const a = { name: "a", handler: () => {} };
		const b = { name: "b", handler: () => {} };
		const node = s.actions([a, b]);
		expect(node).toEqual({
			kind: "row",
			options: { children: [s.action(a), s.action(b)] },
			meta: {},
		});
	});
});

describe("structure data builders", () => {
	test("structure form stores query+schema+children under options and id in meta", () => {
		const query = async () => ({});
		const schema = { parse: (x: unknown) => x };
		const titleNode = s.text({ name: "title" });
		const node = s.form({ query, schema, id: "edit" }, [titleNode]);
		expect(node).toEqual({
			kind: "form",
			options: { query, schema, children: [titleNode] },
			meta: { id: "edit" },
		});
	});

	test("structure table stores options under options and id in meta", () => {
		const query = async () => [];
		const columns = [{ name: "title" }];
		const rowActions = [{ name: "edit", handler: () => {} }];
		const bulkActions = [{ name: "delete", handler: () => {} }];
		const node = s.table({ query, columns, rowActions, bulkActions, id: "list" });
		expect(node).toEqual({
			kind: "table",
			options: { query, columns, rowActions, bulkActions },
			meta: { id: "list" },
		});
	});

	test("structure chart encodes type into kind and stores options, id in meta", () => {
		const query = async () => [{ day: "mon", count: 1 }];
		const series = [{ dataKey: "count", label: "Posts" }];
		const node = s.chart({ type: "line", query, xKey: "day", series, id: "trend" });
		expect(node).toEqual({
			kind: "chart:line",
			options: { type: "line", query, xKey: "day", series },
			meta: { id: "trend" },
		});
	});
});

describe("structure proxy", () => {
	test("structure proxy unknown builder key returns undefined", () => {
		const builder = s as unknown as Record<string, unknown>;
		expect(builder.unknownThing).toBeUndefined();
	});
});
