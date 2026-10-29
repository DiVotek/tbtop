import { describe, expect, test } from "bun:test";
import {
	Column,
	createAdmin,
	definePage,
	EditAction,
	Effects,
	type Row,
	type S,
	Tab,
} from "../src";
import { type MemoryQuery, memoryDriver, memoryQuery } from "../src/adapters/memory";

const people: Row[] = [
	{
		id: 1,
		name: "Ada",
		role: "admin",
		joined: "2024-01-10",
		active: true,
		sort_order: 0,
		starts: "09:30:00",
	},
	{ id: 2, name: "Bob", role: "editor", joined: "2024-02-20", active: false, sort_order: 1 },
	{
		id: 3,
		name: "Cy",
		role: "editor",
		joined: "2024-03-30 18:00:00",
		active: true,
		sort_order: 2,
	},
];
const saved: unknown[] = [];

function view(s: S) {
	return s.stack([
		s.form("person", [
			s.text("name").label("Name").required(),
			s
				.select("role")
				.dependsOn("name")
				.query((deps, search) =>
					["admin", "editor"]
						.filter((r) => r.includes(search))
						.map((r) => ({ value: r, label: `${r} of ${deps.name ?? "?"}` })),
				),
			s
				.select("team")
				.options([{ value: "a", label: "A" }])
				.creatable([s.text("title").label("Title").required()], (v) => ({
					value: v.title,
					label: v.title,
				})),
			s
				.relation("manager_id")
				.labelKey("name")
				.query(() => memoryQuery(() => people)),
			s
				.daterange("window")
				.dependsOn("name")
				.disabledRanges((deps) => [
					{ from: null, to: deps.name === "Ada" ? "2026-01-01" : "2025-01-01" },
				]),
			s
				.liveRegion("greeting")
				.dependsOn("name")
				.render((deps, r) => [r.displayText(`Hi ${String(deps.name ?? "")}`)]),
			s.actionsRow([
				s
					.action("check")
					.handle((ctx) => Effects.make().notify(String(ctx.form.name)), ["form"]),
				s
					.action("draft")
					.withoutValidation()
					.handle((ctx) => Effects.make().notify(JSON.stringify(ctx.form)), ["form"]),
			]),
		]),
		s
			.chart("signups", "bar", { xKey: "month" })
			.query((_request, params) => [{ month: String(params.range), count: 3 }])
			.params([
				s
					.select("range")
					.options([{ value: "year", label: "Year" }])
					.default("year"),
			])
			.toNode(),
		s
			.stat("People")
			.value(() => people.length)
			.poll(10)
			.toNode(),
		s
			.stat("Signups")
			.value((params) => `${String(params.period)} from ${String(params.from)}`)
			.params([
				s
					.select("period")
					.options([
						{ value: "7d", label: "7 days" },
						{ value: "30d", label: "30 days" },
					])
					.default("7d")
					.rules("in:7d,30d"),
				s.date("from").default("2026-01-01"),
			])
			.toNode(),
		s
			.table<MemoryQuery>("people")
			.columns([
				Column.make("name").individuallySearchable(),
				Column.make("joined").date("d.m.Y"),
				Column.make("starts").time("H:i"),
				Column.make("active")
					.toggle()
					.rules("boolean")
					.onSave((row, value) => {
						saved.push([row.id, value]);
					}),
			])
			.filters([
				s.inFilter("role").options([{ value: "editor", label: "Editor" }]),
				s.daterange("joined"),
			])
			.tabs([
				Tab.make<MemoryQuery>("all").count(),
				Tab.make<MemoryQuery>("active")
					.query((q) => ({ ...q, filters: [...q.filters, (r) => r.active === true] }))
					.count(),
			])
			.query(() => memoryQuery(() => people)),
		s.actionsRow([
			EditAction.make(s, {
				form: s.form("edit", [
					s.text("name").label("Name").required().rules("max:3"),
					s.date("joined"),
				]),
				loadUsing: (ctx) => people.find((p) => p.id === ctx.key()) ?? {},
				saveUsing: (ctx) => Effects.make().notify(`saved ${String(ctx.form.name)}`),
			}),
		]),
	]);
}

const admin = createAdmin({
	allowGuests: true,
	prefix: "/admin",
	driver: memoryDriver() as never,
	pages: [definePage({ path: "people", title: "People", view })],
});

async function call(path: string, body?: unknown) {
	const init =
		body === undefined
			? {}
			: {
					method: "POST",
					body: JSON.stringify(body),
					headers: { "content-type": "application/json" },
				};
	const res = await admin.handle(new Request(`http://x/admin/people/${path}`, init));
	if (res === null) {
		throw new TypeError(`${path} is not an endpoint`);
	}
	return { status: res.status, body: await res.json() };
}

describe("page-scoped endpoints", () => {
	test("select-options: search, then label lookup by value, deps filtered", async () => {
		const { body } = await call("select-options/role", {
			search: "ed",
			deps: { name: "Ada", evil: "x" },
		});
		expect(body).toEqual({ options: [{ value: "editor", label: "editor of Ada" }] });
		const one = await call("select-options/role", { value: "admin" });
		expect(one.body).toEqual({ option: { label: "admin of ?", value: "admin" } });
	});

	test("select-create validates the mini-form", async () => {
		expect((await call("select-create/team", {})).status).toBe(422);
		expect((await call("select-create/team", { title: "Ops" })).body).toEqual({
			value: "Ops",
			label: "Ops",
		});
	});

	test("relation-search runs through the query driver", async () => {
		const { body } = await call("relation-search/manager_id", { search: "b" });
		expect(body).toEqual({ options: [{ value: "2", label: "Bob" }] });
		expect((await call("relation-search/manager_id", { value: "3" })).body).toEqual({
			option: { value: "3", label: "Cy" },
		});
	});

	test("daterange-ranges and live-region re-run with the declared deps", async () => {
		expect((await call("daterange-ranges/window", { deps: { name: "Ada" } })).body).toEqual({
			ranges: [{ from: null, to: "2026-01-01" }],
		});
		const { body } = await call("live-region/greeting", { deps: { name: "Bo" } });
		expect(body.nodes[0].options.content).toBe("Hi Bo");
	});

	test("data: chart params default from the declared fields; stats answer their query", async () => {
		expect((await call("data/signups")).body).toEqual({ data: [{ month: "year", count: 3 }] });
		expect((await call("data/People")).body).toEqual({ data: { value: 3 } });
	});

	test("data: a parameterized stat reads its params from the query string", async () => {
		const signups = async (query: string) => (await call(`data/Signups?${query}`)).body;
		expect(await signups("period=30d&from=2026-10-01")).toEqual({
			data: { value: "30d from 2026-10-01" },
		});
		expect(await signups("page=2")).toEqual({ data: { value: "7d from 2026-01-01" } });
		expect(await signups("period=&from=2026-10-01")).toEqual({
			data: { value: "7d from 2026-10-01" },
		});
	});

	test("data: a param value its rules refuse, or an array-shaped one, answers 422", async () => {
		const refused = await call("data/Signups?period=999999d");
		expect(refused.status).toBe(422);
		expect(Object.keys(refused.body.errors)).toEqual(["period"]);
		for (const query of ["range[]=year", "range=year&range=month"]) {
			const array = await call(`data/signups?${query}`);
			expect(array.status).toBe(422);
			expect(array.body.errors.range).toEqual(["The range param must be a single value."]);
		}
	});

	test("an action validates its enclosing form, unless withoutValidation()", async () => {
		const failed = await call("actions/check", { payload: { form: { name: "" } } });
		expect(failed.status).toBe(422);
		expect(failed.body.errors).toEqual({ name: ["The Name field is required."] });
		const ok = await call("actions/check", { payload: { form: { name: "Ada", evil: 1 } } });
		expect(ok.body.effects[0].message).toBe("Ada");
		const draft = await call("actions/draft", { payload: { form: { name: "", evil: 1 } } });
		expect(JSON.parse(draft.body.effects[0].message)).toEqual({ name: null });
	});

	test("EditAction: modal query loads the row, the inner save validates the modal form", async () => {
		expect(
			(await call("actions/edit/data", { payload: { row: { _key: 2 } } })).body.data.name,
		).toBe("Bob");
		const cy = await call("actions/edit/data", { payload: { row: { _key: 3 } } });
		expect(cy.body.data.joined).toBe("2024-03-30");
		const tooLong = await call("actions/editSave", {
			payload: { row: { _key: 2 }, form: { name: "Robert" } },
		});
		expect(tooLong.body.errors.name).toEqual([
			"The Name field must not be greater than 3 characters.",
		]);
		const ok = await call("actions/editSave", {
			payload: { row: { _key: 2 }, form: { name: "Rob" } },
		});
		expect(ok.body.effects[0].message).toBe("saved Rob");
	});

	test("tables: tab scope, counts, filters, column search, date format", async () => {
		const all = await call("tables/people?tab=active");
		expect(all.body.data.tabCounts).toEqual({ all: 3, active: 2 });
		expect(all.body.data.data.map((r: Row) => r.name)).toEqual(["Ada", "Cy"]);
		const filtered = await call(
			"tables/people?filters[role][]=editor&filters[joined][to]=2024-03-30",
		);
		expect(filtered.body.data.data.map((r: Row) => [r.name, r.joined])).toEqual([
			["Bob", "20.02.2024"],
			["Cy", "30.03.2024"],
		]);
		const ada = await call("tables/people?colSearch[name]=ad");
		expect(ada.body.data.total).toBe(1);
		expect(ada.body.data.data[0].starts).toBe("09:30");
		expect((await call("tables/people?tab=nope")).status).toBe(422);
	});

	test("cells: validate the value, find the row in scope, run onSave", async () => {
		expect(
			(await call("cells/people/active", { payload: { id: 2, value: "maybe" } })).status,
		).toBe(422);
		const ok = await call("cells/people/active", { payload: { id: 2, value: true } });
		expect(ok.body.effects).toEqual([{ kind: "refreshTable", table: "people" }]);
		expect(saved).toEqual([[2, true]]);
		expect(
			(await call("cells/people/active", { payload: { id: 99, value: true } })).status,
		).toBe(404);
	});

	test("unknown entities 404; a GET-only endpoint refuses POST", async () => {
		expect((await call("select-options/nope", {})).status).toBe(404);
		expect((await call("tables/people", {})).status).toBe(405);
	});
});
