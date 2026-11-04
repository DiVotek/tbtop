import { beforeEach, describe, expect, test } from "bun:test";
import { type AdminConfig, createAdmin, definePage, Embed } from "../src";

let submitted: Record<string, unknown> | null = null;
let actionForm: Record<string, unknown> | null = null;

const pages = [
	definePage({
		path: "profile",
		title: "Profile",
		view: (s) =>
			s.stack([
				s
					.form("profile", [
						s.text("email").rules("required|email"),
						s.text("site").rules("nullable|url"),
						s.text("nickname"),
						s.text("signature"),
						s.password("password"),
						s.password("password_confirmation"),
						s.password("current_password"),
						s.repeater("links").fields([s.text("label"), s.text("href")]),
						s.richtext("bio").embeds([
							Embed.make("callout")
								.label("Callout")
								.fields([s.text("title")]),
						]),
					])
					.onSubmit(({ form }) => {
						submitted = form;
					}),
				s.action("note").handle((ctx) => {
					actionForm = ctx.form;
				}),
			]),
	}),
];

const panel = (extra: Partial<AdminConfig> = {}) =>
	createAdmin({ allowGuests: true, prefix: "/admin", pages, ...extra });

const post = (admin: ReturnType<typeof createAdmin>, path: string, body: unknown) =>
	admin.handle(
		new Request(`http://x/admin/profile/${path}`, {
			method: "POST",
			body: JSON.stringify(body),
			headers: { "content-type": "application/json", accept: "application/json" },
		}),
	);

const paragraph = (text: string) => ({
	type: "paragraph",
	children: [{ type: "text", text, format: 0, detail: 0, mode: "normal", style: "" }],
	format: "",
	indent: 0,
	direction: null,
});
const doc = (...children: unknown[]) => ({
	root: { type: "root", children, format: "", indent: 0, direction: null },
});

beforeEach(() => {
	submitted = null;
	actionForm = null;
});

describe("TrimStrings before validation", () => {
	test("strings are trimmed (zero-width and BOM too) before rules run", async () => {
		await post(panel(), "forms/profile", {
			email: "  a@b.co\u200B ",
			site: "\uFEFF https://example.com \t",
			nickname: "   ",
			links: [{ label: " Docs ", href: "\n/docs " }],
		});
		expect(submitted).toMatchObject({
			email: "a@b.co",
			site: "https://example.com",
			nickname: null,
			links: [{ label: "Docs", href: "/docs" }],
		});
	});

	test("password fields keep their whitespace, like Laravel's neverTrim", async () => {
		await post(panel(), "forms/profile", {
			email: "a@b.co",
			password: " secret ",
			password_confirmation: " secret ",
			current_password: " old ",
		});
		expect(submitted).toMatchObject({
			password: " secret ",
			password_confirmation: " secret ",
			current_password: " old ",
		});
	});

	test("a richtext document is left as written; its embed data is trimmed", async () => {
		const bio = doc(paragraph("  indented  "), {
			type: "embed",
			version: 1,
			id: "a",
			kind: "callout",
			data: { title: " Hi " },
		});
		await post(panel(), "forms/profile", { email: "a@b.co", bio });
		const [text, embed] =
			JSON.stringify(submitted?.bio).match(/"text":"[^"]*"|"data":\{[^}]*\}/g) ?? [];
		expect([text, embed]).toEqual(['"text":"  indented  "', '"data":{"title":"Hi"}']);
	});

	test("action payloads are trimmed too, password keys at any depth excepted", async () => {
		await post(panel(), "actions/note", {
			payload: { form: { nickname: " Max ", password: " p " } },
		});
		expect(actionForm).toMatchObject({ nickname: "Max", password: " p " });
	});

	test("trimStrings.except names more keys; false turns trimming off", async () => {
		await post(panel({ trimStrings: { except: ["signature"] } }), "forms/profile", {
			email: "a@b.co",
			signature: "  -- Max  ",
			nickname: " Max ",
		});
		expect(submitted).toMatchObject({ signature: "  -- Max  ", nickname: "Max" });

		submitted = null;
		await post(panel({ trimStrings: false }), "forms/profile", { email: " a@b.co " });
		expect(submitted).toBeNull();
	});
});
