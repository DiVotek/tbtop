import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import type { SerializedEditorState } from "lexical";
import { DisplayAlertBlock } from "./displayAlertBlock";
import { DisplayDividerBlock } from "./displayDividerBlock";
import { DisplayHtmlBlock } from "./displayHtmlBlock";
import { DisplayImageBlock } from "./displayImageBlock";
import { DisplayKeyValueBlock } from "./displayKeyValueBlock";
import { DisplayRichtextBlock } from "./displayRichtextBlock";
import { DisplayTextBlock } from "./displayTextBlock";
import { DisplayValueBlock } from "./displayValueBlock";

const NOOP_CTX = { surface: "form" as const, form: undefined };
const NOOP_RENDER = () => null;
const NOOP_META = {};

// ---------------------------------------------------------------------------
// DisplayTextBlock
// ---------------------------------------------------------------------------

describe("DisplayTextBlock", () => {
	test("renders content as a paragraph", () => {
		const { container } = render(
			<DisplayTextBlock
				options={{ content: "Hello world" }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		expect(container.querySelector("p")?.textContent).toBe("Hello world");
	});

	test("body variant emits text-sm class", () => {
		const { container } = render(
			<DisplayTextBlock
				options={{ content: "Body text", variant: "body" }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		expect(container.querySelector("p")?.className).toContain("text-sm");
	});

	test("heading variant emits text-2xl and font-bold classes", () => {
		const { container } = render(
			<DisplayTextBlock
				options={{ content: "Title", variant: "heading" }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		const p = container.querySelector("p");
		expect(p?.className).toContain("text-2xl");
		expect(p?.className).toContain("font-bold");
	});

	test("subheading variant emits text-lg and font-semibold classes", () => {
		const { container } = render(
			<DisplayTextBlock
				options={{ content: "Sub", variant: "subheading" }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		const p = container.querySelector("p");
		expect(p?.className).toContain("text-lg");
		expect(p?.className).toContain("font-semibold");
	});

	test("muted variant emits text-muted-foreground class", () => {
		const { container } = render(
			<DisplayTextBlock
				options={{ content: "Hint", variant: "muted" }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		expect(container.querySelector("p")?.className).toContain("text-muted-foreground");
	});

	test("defaults to body variant when variant is absent", () => {
		const { container } = render(
			<DisplayTextBlock
				options={{ content: "No variant" }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		expect(container.querySelector("p")?.className).toContain("text-sm");
	});
});

// ---------------------------------------------------------------------------
// DisplayHtmlBlock
// ---------------------------------------------------------------------------

describe("DisplayHtmlBlock", () => {
	test("renders raw HTML via dangerouslySetInnerHTML", () => {
		const html = "<strong>bold</strong> and <em>italic</em>";
		const { container } = render(
			<DisplayHtmlBlock
				options={{ html }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		expect(container.querySelector("strong")?.textContent).toBe("bold");
		expect(container.querySelector("em")?.textContent).toBe("italic");
	});

	test("renders block-level html", () => {
		const { container } = render(
			<DisplayHtmlBlock
				options={{ html: "<p>Paragraph</p>" }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		expect(container.querySelector("p")?.textContent).toBe("Paragraph");
	});
});

// ---------------------------------------------------------------------------
// DisplayDividerBlock
// ---------------------------------------------------------------------------

describe("DisplayDividerBlock", () => {
	test("renders a div with border-t class", () => {
		const { getByTestId } = render(
			<DisplayDividerBlock
				options={{}}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		const el = getByTestId("display-divider-block");
		expect(el.tagName.toLowerCase()).toBe("div");
		expect(el.className).toContain("border-t");
	});
});

// ---------------------------------------------------------------------------
// DisplayAlertBlock
// ---------------------------------------------------------------------------

describe("DisplayAlertBlock", () => {
	test("renders message text", () => {
		const { getByTestId } = render(
			<DisplayAlertBlock
				options={{ message: "Something happened" }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		expect(getByTestId("display-alert-block").textContent).toContain("Something happened");
	});

	test("renders title when provided", () => {
		const { getByTestId } = render(
			<DisplayAlertBlock
				options={{ message: "Body", title: "Heads up" }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		const el = getByTestId("display-alert-block");
		expect(el.textContent).toContain("Heads up");
		expect(el.textContent).toContain("Body");
	});

	test("omits title element when title is absent", () => {
		const { container } = render(
			<DisplayAlertBlock
				options={{ message: "No title here" }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		// Only one <p>: the description. No title <p> rendered.
		const paragraphs = container.querySelectorAll("p");
		expect(paragraphs.length).toBe(1);
		expect(paragraphs[0]?.textContent).toBe("No title here");
	});

	test("success color applies green classes", () => {
		const { getByTestId } = render(
			<DisplayAlertBlock
				options={{ message: "OK", color: "success" }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		expect(getByTestId("display-alert-block").className).toContain("green");
	});

	test("warning color applies yellow classes", () => {
		const { getByTestId } = render(
			<DisplayAlertBlock
				options={{ message: "Careful", color: "warning" }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		expect(getByTestId("display-alert-block").className).toContain("yellow");
	});

	test("danger color applies red classes", () => {
		const { getByTestId } = render(
			<DisplayAlertBlock
				options={{ message: "Error", color: "danger" }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		expect(getByTestId("display-alert-block").className).toContain("red");
	});

	test("unknown color falls back to info", () => {
		const { getByTestId } = render(
			<DisplayAlertBlock
				options={{ message: "Info", color: "unknown-color" }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		// info variant has blue classes
		expect(getByTestId("display-alert-block").className).toContain("blue");
	});
});

// ---------------------------------------------------------------------------
// DisplayValueBlock
// ---------------------------------------------------------------------------

describe("DisplayValueBlock", () => {
	test("badge kind renders a Badge with the value and a color class", () => {
		const { container } = render(
			<DisplayValueBlock
				options={{
					value: "active",
					kind: "badge",
					badge: { colors: { active: "success" } },
				}}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		const badge = container.querySelector('[data-slot="badge"]') ?? container.firstElementChild;
		expect(badge?.textContent).toBe("active");
		// success maps to the bg-success color class via the color registry.
		expect(badge?.className).toContain("bg-success");
	});

	test("boolean kind renders an icon (svg), not text", () => {
		const { container } = render(
			<DisplayValueBlock
				options={{ value: true, kind: "boolean" }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		expect(container.querySelector("svg")).not.toBeNull();
	});

	test("money kind renders the pre-formatted value verbatim", () => {
		const { container } = render(
			<DisplayValueBlock
				options={{ value: "123.45 USD", kind: "money" }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		expect(container.querySelector("span")?.textContent).toBe("123.45 USD");
	});

	test("date kind renders the pre-formatted value verbatim", () => {
		const { container } = render(
			<DisplayValueBlock
				options={{ value: "2024-03-15", kind: "date" }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		expect(container.querySelector("span")?.textContent).toBe("2024-03-15");
	});
});

// ---------------------------------------------------------------------------
// DisplayImageBlock
// ---------------------------------------------------------------------------

describe("DisplayImageBlock", () => {
	test("renders a full-size img with src and alt", () => {
		const { container } = render(
			<DisplayImageBlock
				options={{ src: "/img/a.png", alt: "An image" }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		const img = container.querySelector("img");
		expect(img?.getAttribute("src")).toBe("/img/a.png");
		expect(img?.getAttribute("alt")).toBe("An image");
		expect(img?.className).toContain("max-w-full");
	});

	test("file mode renders a download anchor, no img", () => {
		const { container } = render(
			<DisplayImageBlock
				options={{ src: "/files/report.pdf", asLink: true, caption: "Report" }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		const anchor = container.querySelector("a");
		expect(anchor?.getAttribute("href")).toBe("/files/report.pdf");
		expect(anchor?.hasAttribute("download")).toBe(true);
		expect(anchor?.textContent).toBe("Report");
		expect(container.querySelector("img")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// DisplayKeyValueBlock
// ---------------------------------------------------------------------------

describe("DisplayKeyValueBlock", () => {
	test("renders a <dl> with a dt/dd per entry", () => {
		const { container } = render(
			<DisplayKeyValueBlock
				options={{ entries: { SKU: "A-1", Weight: "2kg" } }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		expect(container.querySelector("dl")).not.toBeNull();
		const dts = [...container.querySelectorAll("dt")].map((el) => el.textContent);
		const dds = [...container.querySelectorAll("dd")].map((el) => el.textContent);
		expect(dts).toEqual(["SKU", "Weight"]);
		expect(dds).toEqual(["A-1", "2kg"]);
	});
});

// ---------------------------------------------------------------------------
// DisplayRichtextBlock — assert lightly; happy-dom can't fully render Lexical.
// The real check is the browser smoke test.
// ---------------------------------------------------------------------------

describe("DisplayRichtextBlock", () => {
	const STATE = {
		root: {
			children: [
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: "Hello",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
			],
			direction: "ltr",
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
		// Boundary cast (tsc requires the unknown hop): a deliberately minimal
		// Lexical state fixture — the full SerializedLexicalNode shape is the
		// library's, not ours to reconstruct here.
	} as unknown as SerializedEditorState;

	// happy-dom cannot mount the full Lexical composer (it throws on
	// HISTORY_MERGE_TAG init), so we assert only that a non-empty state mounts
	// the lazy Suspense boundary — the real render check is the browser smoke.
	test("mounts the lazy boundary for a non-empty state", () => {
		const { container } = render(
			<DisplayRichtextBlock
				options={{ state: STATE }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		// Suspense fallback renders synchronously before the lazy chunk loads.
		expect(container.innerHTML).not.toBe("");
	});

	test("renders nothing when state is missing", () => {
		const { container } = render(
			<DisplayRichtextBlock
				options={{ state: null }}
				meta={NOOP_META}
				ctx={NOOP_CTX}
				renderChild={NOOP_RENDER}
			/>,
		);
		expect(container.innerHTML).toBe("");
	});
});
