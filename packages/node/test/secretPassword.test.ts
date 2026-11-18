import { beforeEach, describe, expect, test } from "bun:test";
import { createAdmin, definePage, type InertiaPage } from "../src";
import { Password } from "../src/dsl/fields/strings";

let submitted: Record<string, unknown> | null = null;
let actionForm: Record<string, unknown> | null = null;

const stored = {
	name: "Acme",
	api_key: "sk_live_abcd4242",
	webhook: "whsec_1",
	pin: "1234",
	token: "tok_1",
};

const pages = [
	definePage({
		path: "settings",
		title: "Settings",
		view: (s) =>
			s.stack([
				s
					.form("settings", [
						s.text("name"),
						s.section({ title: "Keys" }, [
							s
								.password("api_key")
								.preview((v) => `…${v.slice(-4)}`)
								.required(),
							s.password("webhook").clearable(),
						]),
						s.password("pin").secret().minLength(4),
						s.password("fresh").secret().required(),
						s.password("token").clearable().required(),
						s.action("rotate").handle(
							(ctx) => {
								actionForm = ctx.form;
							},
							["form"],
						),
					])
					.record(stored)
					.onSubmit(({ form }) => {
						submitted = form;
					}),
			]),
	}),
];

const admin = createAdmin({ allowGuests: true, prefix: "/admin", pages });

const post = (path: string, body: unknown) =>
	admin.handle(
		new Request(`http://x/admin/settings/${path}`, {
			method: "POST",
			body: JSON.stringify(body),
			headers: { "content-type": "application/json", accept: "application/json" },
		}),
	);

async function page(): Promise<InertiaPage> {
	const res = await admin.handle(
		new Request("http://x/admin/settings", { headers: { "x-inertia": "true" } }),
	);
	if (res === null) {
		throw new Error("no response");
	}
	return (await res.json()) as InertiaPage;
}

function findNode(tree: unknown, name: string): Record<string, unknown> | null {
	if (tree === null || typeof tree !== "object") {
		return null;
	}
	const node = tree as Record<string, unknown>;
	if (node.name === name && node.kind === "password") {
		return node;
	}
	for (const value of Object.values(node)) {
		const found = findNode(value, name);
		if (found !== null) {
			return found;
		}
	}
	return null;
}

beforeEach(() => {
	submitted = null;
	actionForm = null;
});

describe("Password::secret()", () => {
	test("the stored value never ships; the node says it is set, with the preview", async () => {
		const props = (await page()).props;
		expect(props.data).toEqual({ settings: { name: "Acme" } });
		expect(JSON.stringify(props)).not.toContain("abcd4242");
		expect(JSON.stringify(props)).not.toContain("whsec_1");
		const options = (name: string) =>
			findNode(props.structure, name)?.options as { secret?: unknown } | undefined;
		expect(options("api_key")?.secret).toEqual({ filled: true, preview: "…4242" });
		expect(options("webhook")?.secret).toEqual({ filled: true, clearable: true });
		expect(options("pin")?.secret).toEqual({ filled: true });
		expect(options("fresh")?.secret).toEqual({ filled: false });
		expect(options("token")?.secret).toEqual({ filled: true });
	});

	test("a secret left alone is absent from the submit, and a stored required one passes", async () => {
		await post("forms/settings", { name: "Acme 2", fresh: "new" });
		expect(submitted).toEqual({ name: "Acme 2", fresh: "new" });
	});

	test("a null is dropped unless the field is clearable, where it clears", async () => {
		await post("forms/settings", { pin: null, webhook: null, fresh: "x" });
		expect(submitted).toEqual({ webhook: null, fresh: "x" });
	});

	test("a replacement is validated and passed on", async () => {
		await post("forms/settings", { pin: "12", fresh: "x" });
		expect(submitted).toBeNull();
		await post("forms/settings", { api_key: "sk_live_new", fresh: "x" });
		expect(submitted).toEqual({ api_key: "sk_live_new", fresh: "x" });
	});

	test("required still holds for a secret with nothing stored, and refuses a clear", async () => {
		await post("forms/settings", {});
		expect(submitted).toBeNull();
		await post("forms/settings", { api_key: null, fresh: "x" });
		expect(submitted).toEqual({ fresh: "x" });
	});

	test("a required secret is never cleared, even one marked clearable()", async () => {
		await post("forms/settings", { token: null, fresh: "x" });
		expect(submitted).toEqual({ fresh: "x" });
	});

	test("an action reading the page form gets the same input", async () => {
		await post("actions/rotate", {
			payload: { form: { pin: null, webhook: null, fresh: "x" } },
		});
		expect(actionForm).toEqual({ webhook: null, fresh: "x" });
	});

	test("a numeric stored value previews as its string form", () => {
		const field = new Password("pin").preview((v) => `…${v.slice(-2)}`);
		field.seedStored(4242);
		expect(
			(field.toNode().toJSON() as { options: { secret: unknown } }).options.secret,
		).toEqual({
			filled: true,
			preview: "…42",
		});
	});

	test("secret() inside a repeater is refused, as its value would ship in the props", () => {
		const view = definePage({
			path: "nested",
			title: "Nested",
			view: (s) =>
				s
					.form("f", [s.repeater("rows").fields([s.password("key").secret()])])
					.record({ rows: [{ key: "k" }] }),
		});
		const nested = createAdmin({ allowGuests: true, prefix: "/admin", pages: [view] });
		return expect(
			nested.handle(
				new Request("http://x/admin/nested", { headers: { "x-inertia": "true" } }),
			),
		).rejects.toThrow("top-level form field only");
	});
});
