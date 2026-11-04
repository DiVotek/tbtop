import { describe, expect, test } from "bun:test";
import { S } from "../src";

const s = new S();
const html = (input: string): string =>
	(s.displayHtml(input).toJSON() as { options: { html: string } }).options.html;

describe("displayHtml() sanitizes by default (HtmlBlock.php)", () => {
	test("keeps safe markup", () => {
		expect(html("<h2>Title</h2><p>Hi <strong>there</strong><br>again</p>")).toBe(
			"<h2>Title</h2><p>Hi <strong>there</strong><br />again</p>",
		);
	});

	test("strips scripts, event handlers, javascript: links and iframes", () => {
		const out = html(
			'<p onclick="steal()">Hi</p><script>alert(1)</script>' +
				'<a href="javascript:alert(1)">x</a><iframe src="https://evil.test"></iframe>',
		);
		expect(out).toContain("<p>Hi</p>");
		for (const banned of ["script", "onclick", "javascript:", "iframe"]) {
			expect(out).not.toContain(banned);
		}
	});

	test("catches obfuscated schemes and entity tricks", () => {
		for (const href of [
			" javascript:x",
			"java\tscript:x",
			"JaVaScRiPt:x",
			"javascript&colon;x",
		]) {
			expect(html(`<a href="${href}">x</a>`)).toBe("<a>x</a>");
		}
		expect(html('<img src="x" srcset="/a.png 1x, javascript:x 2x">')).toBe('<img src="x" />');
	});

	test("keeps http, mailto and relative links and images", () => {
		const out = html(
			'<a href="https://example.test/a">a</a><a href="mailto:a@example.test">m</a>' +
				'<a href="/admin/posts">r</a><img src="/storage/x.png" alt="x">' +
				'<a href="https://example.test/b" target="_blank" rel="noopener">t</a>',
		);
		expect(out).toContain('href="https://example.test/a"');
		expect(out).toContain('href="mailto:a');
		expect(out).toContain('href="/admin/posts"');
		expect(out).toContain('src="/storage/x.png"');
		expect(out).toContain('target="_blank" rel="noopener"');
	});

	test("drops data: and other non-http image sources", () => {
		const out = html('<img src="data:image/png;base64,AAA"><img src="ftp://x/y.png">');
		expect(out).not.toContain("data:");
		expect(out).not.toContain("ftp:");
	});

	test("drops class, style, data-* and inline SVG", () => {
		expect(html('<p class="fixed inset-0 z-50" style="position:fixed">x</p>')).toBe("<p>x</p>");
		expect(html('<p data-x="1">x</p><svg><script>alert(1)</script></svg>')).toBe("<p>x</p>");
	});

	test("re-escapes text and attribute values", () => {
		expect(html('<p title="a&quot;b">1 &lt; 2 &amp; 3</p>')).toBe(
			'<p title="a&quot;b">1 &lt; 2 &amp; 3</p>',
		);
	});

	test("sanitizes input well above a small default length", () => {
		const out = html(`${"<p>row</p>".repeat(5000)}<script>alert(1)</script>`);
		expect(out.startsWith("<p>row</p>")).toBe(true);
		expect(out.split("<p>row</p>").length - 1).toBe(5000);
		expect(out).not.toContain("script");
	});

	test("cuts input above the 1 MB cap instead of throwing", () => {
		const out = html(`${"<p>row</p>".repeat(120_000)}<p>tail</p>`);
		expect(new TextEncoder().encode(out).length).toBeLessThanOrEqual(1_000_000);
		expect(out.startsWith("<p>row</p>")).toBe(true);
		expect(out).not.toContain("tail");
	});

	test("passes markup through unchanged when trusted", () => {
		const raw = '<div onclick="go()"><script>init()</script></div>';
		expect(
			(s.displayHtml(raw).trusted().toJSON() as { options: { html: string } }).options.html,
		).toBe(raw);
	});

	test("trusted() returns a new instance", () => {
		const block = s.displayHtml("<script>x</script>");
		block.trusted();
		expect((block.toJSON() as { options: { html: string } }).options.html).toBe("");
	});
});
