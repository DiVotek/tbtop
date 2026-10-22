import { describe, expect, test } from "bun:test";
import sharp from "sharp";
import { cookieSessions, createAdmin, definePage, memoryDisk } from "../src";
import { sharpImages } from "../src/adapters/sharp";
import { signedViewUrl } from "../src/server/uploads/signing";
import { browser, type Visit, visitPage } from "./support/browser";

const disk = memoryDisk();
const SECRET = "uploads-test-app-key-0123456789abcdef";
let submitted: Record<string, unknown> = {};

const admin = createAdmin({
	allowGuests: true,
	prefix: "/admin",
	session: cookieSessions({ secret: SECRET }),
	secret: SECRET,
	disks: { public: disk },
	images: sharpImages(sharp),
	sanitizeSvg: (svg) => svg.replaceAll(/<script[\s\S]*?<\/script>/g, ""),
	pages: [
		definePage({
			path: "profile",
			title: "Profile",
			view: (s) =>
				s
					.form("profile", [
						s.upload("avatar").accept("image/*").convertTo("webp").maxSize(50_000),
						s.upload("contract").visibility("private").directory("contracts"),
						s.upload("gallery").multiple(),
					])
					.record({
						avatar: "uploads/old.png",
						contract: "contracts/signed.pdf",
						gallery: [],
					})
					.onSubmit(({ form }) => {
						submitted = form;
					}),
		}),
	],
});

const png = async () =>
	new Uint8Array(
		await sharp({ create: { width: 4, height: 4, channels: 3, background: "red" } })
			.png()
			.toBuffer(),
	);

async function upload(visit: Visit, field: string, file: File) {
	const body = new FormData();
	body.append("file", file);
	const res = await visit(`/admin/profile/uploads/${field}`, { method: "POST", body });
	return {
		status: res.status,
		body: (await res.json()) as { data: { path: string; url: string } },
	};
}

const submit = (visit: Visit, form: Record<string, unknown>) =>
	visit("/admin/profile/forms/profile", {
		method: "POST",
		body: JSON.stringify(form),
		inertia: true,
	});

describe("upload field", () => {
	test("stored paths render as {path, url}; a private one gets a signed view URL", async () => {
		const page = await visitPage(browser(admin), "/admin/profile");
		const data = (
			page.props.data as Record<string, Record<string, { path: string; url: string }>>
		).profile;
		expect(data?.avatar).toEqual({ path: "uploads/old.png", url: "/storage/uploads/old.png" });
		expect(data?.contract?.url).toMatch(
			/^\/admin\/profile\/uploads\/contract\/view\?path=contracts%2Fsigned\.pdf&expires=\d+&signature=[0-9a-f]{64}$/,
		);
	});

	test("an image is sniffed, converted to the field's format and stored", async () => {
		const { status, body } = await upload(
			browser(admin),
			"avatar",
			new File([await png()], "me.png"),
		);
		expect(status).toBe(200);
		expect(body.data.path).toMatch(/^uploads\/[A-Za-z0-9]{40}\.webp$/);
		expect(body.data.url).toBe(`/storage/${body.data.path}`);
		expect(disk.files.get(body.data.path)?.type).toBe("image/webp");
	});

	test("the content decides the type: HTML posing as PNG is refused", async () => {
		const fake = new File(["<html><script>alert(1)</script>"], "x.png", { type: "image/png" });
		expect((await upload(browser(admin), "gallery", fake)).status).toBe(422);
		const pdf = new File(["%PDF-1.7"], "x.pdf", { type: "application/pdf" });
		expect((await upload(browser(admin), "avatar", pdf)).status).toBe(422);
	});

	test("SVG goes through the host's sanitizer; size and missing file are 422", async () => {
		const svg = new File(
			['<svg xmlns="http://www.w3.org/2000/svg"><script>x()</script></svg>'],
			"a.svg",
		);
		const { body } = await upload(browser(admin), "gallery", svg);
		expect(await disk.files.get(body.data.path)?.text()).not.toContain("<script");
		const big = new File([new Uint8Array(60_000)], "big.bin");
		expect((await upload(browser(admin), "avatar", big)).status).toBe(422);
		const empty = await browser(admin)("/admin/profile/uploads/avatar", {
			method: "POST",
			body: new FormData(),
		});
		expect(empty.status).toBe(422);
	});

	test("the extension comes from the sniffed type, never a markup one from the client", async () => {
		const padded = `${"x".repeat(2048)}<script>alert(1)</script>`;
		const html = new File([padded], "evil.html", { type: "text/plain" });
		expect((await upload(browser(admin), "gallery", html)).body.data.path).toMatch(/\.bin$/);
		const csv = new File(["a,b"], "rows.csv", { type: "text/csv" });
		expect((await upload(browser(admin), "gallery", csv)).body.data.path).toMatch(/\.csv$/);
		const disguised = new File(["<?foo?>not markup"], "x.svg", { type: "image/svg+xml" });
		const stored = await upload(browser(admin), "gallery", disguised);
		expect(stored.body.data.path).toMatch(/\.bin$/);
		expect(disk.files.get(stored.body.data.path)?.type).toBe("application/octet-stream");
	});

	test("an SVG behind processing instructions is still sniffed and sanitized", async () => {
		const svg = new File(
			['<?foo?><svg xmlns="http://www.w3.org/2000/svg"><script>x()</script></svg>'],
			"a.txt",
			{
				type: "text/plain",
			},
		);
		const { body } = await upload(browser(admin), "gallery", svg);
		expect(body.data.path).toMatch(/\.svg$/);
		expect(await disk.files.get(body.data.path)?.text()).not.toContain("<script");
	});

	test("a submit may only claim paths issued to this session or already stored", async () => {
		const visit = browser(admin);
		const { body } = await upload(visit, "avatar", new File([await png()], "me.png"));
		await submit(visit, { avatar: "uploads/someone-elses.png", gallery: [] });
		expect((await visitPage(visit, "/admin/profile")).props.errors).toEqual({
			avatar: "The selected avatar is invalid.",
		});
		await submit(visit, {
			avatar: body.data.path,
			contract: "contracts/signed.pdf",
			gallery: [],
		});
		expect(submitted).toMatchObject({
			avatar: body.data.path,
			contract: "contracts/signed.pdf",
		});
		await submit(browser(admin), { avatar: body.data.path });
		expect(submitted.avatar).toBe(body.data.path);
	});
});

describe("private view route", () => {
	test("a signed URL streams the file; tampering or leaving the directory is 403", async () => {
		const visit = browser(admin);
		const pdf = new File(["%PDF-1.7 secret"], "c.pdf");
		const { body } = await upload(visit, "contract", pdf);
		const ok = await visit(body.data.url);
		expect([ok.status, ok.headers.get("x-content-type-options")]).toEqual([200, "nosniff"]);
		expect(await ok.text()).toBe("%PDF-1.7 secret");
		expect((await visit(body.data.url.replace("contracts%2F", "contracts%2Fx"))).status).toBe(
			403,
		);
		const outside = await signedViewUrl(SECRET, "/admin/profile/uploads/contract/view", {
			path: "uploads/old.png",
		});
		expect((await visit(outside)).status).toBe(403);
		expect(
			(await visit("/admin/profile/uploads/avatar/view?path=uploads/old.png")).status,
		).toBe(404);
	});
});
