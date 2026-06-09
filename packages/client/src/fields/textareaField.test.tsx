import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderNode } from "../render/structureRenderer";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { TextareaCell, TextareaForm } from "./textareaField";

describe("Textarea field", () => {
	test("Textarea renders a textarea element with rows from options", async () => {
		const node = s.form({ query: async () => ({ body: "Hello" }) }, [
			s.textarea({ name: "body", rows: 6 }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		const textarea = container.querySelector("textarea");
		expect(textarea).not.toBeNull();
		expect(textarea?.getAttribute("rows")).toBe("6");
	});

	test("Textarea autoresize true omits field-sizing-fixed override", async () => {
		const node = s.form({ query: async () => ({ body: "Hi" }) }, [
			s.textarea({ name: "body", autoresize: true }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		const textarea = container.querySelector("textarea");
		expect(textarea?.className).not.toContain("field-sizing-fixed");
	});

	test("Textarea autoresize false applies field-sizing-fixed class", async () => {
		const node = s.form({ query: async () => ({ body: "Hi" }) }, [
			s.textarea({ name: "body" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		const textarea = container.querySelector("textarea");
		expect(textarea?.className).toContain("field-sizing-fixed");
	});

	test("Textarea clearing the input emits null through onChange", async () => {
		const captured: (string | null)[] = [];
		const user = userEvent.setup();
		const { container } = render(
			<TextareaForm
				name="body"
				value="X"
				onChange={(next) => {
					captured.push(next);
				}}
			/>,
		);
		const textarea = container.querySelector("textarea");
		if (!textarea) {
			throw new Error("textarea missing");
		}
		await user.type(textarea, "{Backspace}");
		expect(captured.at(-1)).toBeNull();
	});

	test("Textarea typed input emits string value", async () => {
		const captured: (string | null)[] = [];
		const user = userEvent.setup();
		const { container } = render(
			<TextareaForm
				name="body"
				value=""
				onChange={(next) => {
					captured.push(next);
				}}
			/>,
		);
		const textarea = container.querySelector("textarea");
		if (!textarea) {
			throw new Error("textarea missing");
		}
		await user.type(textarea, "x");
		expect(captured.at(-1)).toBe("x");
	});

	test("Textarea placeholder reaches the rendered element", async () => {
		const node = s.form({ query: async () => ({ body: null }) }, [
			s.textarea({ name: "body", placeholder: "Write…" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		const textarea = container.querySelector("textarea");
		expect(textarea?.getAttribute("placeholder")).toBe("Write…");
	});

	test("Textarea form-block wraps label and required marker, component renders only the input", async () => {
		const node = s.form({ query: async () => ({ body: null }) }, [
			s.textarea({ name: "body", label: "Body", required: true }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		const label = container.querySelector("label");
		expect(label?.textContent).toContain("Body");
		expect(label?.querySelector("span.text-destructive")?.textContent).toBe("*");
	});

	test("Textarea renders empty string when value is null", () => {
		const { container } = render(<TextareaForm name="body" value={null} onChange={() => {}} />);
		const textarea = container.querySelector("textarea") as HTMLTextAreaElement | null;
		expect(textarea).not.toBeNull();
		expect(textarea?.value).toBe("");
	});

	test("TextareaCell renders a single-line truncated preview for long values", () => {
		const long = "x".repeat(120);
		const { container } = render(<TextareaCell value={long} />);
		const span = container.querySelector("span");
		expect(span?.textContent?.endsWith("…")).toBe(true);
		expect(span?.textContent?.length).toBe(81);
		expect(span?.getAttribute("title")).toBe(long);
	});

	test("TextareaCell renders nothing for null value", () => {
		const { container } = render(<TextareaCell value={null} />);
		expect(container.textContent).toBe("");
	});
});
