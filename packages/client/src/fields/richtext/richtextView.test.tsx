import { describe, expect, it } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import { RichtextView } from "./richtextView";

describe("RichtextView", () => {
	it("renders an HTML string value as rich content, not literal markup", async () => {
		const { container } = render(<RichtextView state="<h1>Title</h1><p>Body</p>" />);
		await waitFor(() => {
			expect(container.querySelector("h1")?.textContent).toBe("Title");
		});
		expect(container.textContent).not.toContain("<h1>");
		expect(container.textContent).toContain("Body");
	});

	it("keeps quotes and backslashes intact in legacy plain-string values", async () => {
		const { container } = render(<RichtextView state={'say "hi" \\ bye'} />);
		await waitFor(() => {
			expect(container.textContent).toContain('say "hi" \\ bye');
		});
	});
});
