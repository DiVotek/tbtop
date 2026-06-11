import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { DisplayAlertBlock } from "./displayAlertBlock";
import { DisplayDividerBlock } from "./displayDividerBlock";
import { DisplayHtmlBlock } from "./displayHtmlBlock";
import { DisplayTextBlock } from "./displayTextBlock";

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
