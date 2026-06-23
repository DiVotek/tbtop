import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { RowProvider } from "../structure/rowContext";
import { clientWrapper } from "../testFixtures";
import { basename, UploadCell, UploadForm, type UploadValue } from "./uploadField";

const SAMPLE: UploadValue = { path: "uploads/pic.png", url: "/uploads/pic.png" };

function uploadResponse(path = "uploads/pic.png", url = "/uploads/pic.png") {
	return { data: { path, url } };
}

describe("UploadForm", () => {
	test("Upload posts the picked file to the configured endpoint and emits preview data", async () => {
		const seen: string[] = [];
		const Wrap = clientWrapper(() => new Response("{}"));
		const captured: (UploadValue | UploadValue[] | string | string[] | null)[] = [];
		const { container } = render(
			<Wrap>
				<UploadForm
					name="file"
					value={null}
					onChange={(v) => captured.push(v)}
					options={{
						upload: async (_ctx, file) => {
							seen.push(file.name);
							return uploadResponse("uploads/hello.png", "/uploads/hello.png");
						},
					}}
				/>
			</Wrap>,
		);
		const file = new File(["x"], "hello.png", { type: "image/png" });
		const input = container.querySelector("input[type=file]") as HTMLInputElement;
		await userEvent.upload(input, file);
		await waitFor(() => expect(captured.length).toBeGreaterThan(0));
		expect(seen[0]).toBe("hello.png");
		expect(captured.at(-1)).toEqual({ path: "uploads/hello.png", url: "/uploads/hello.png" });
	});

	test("Upload keeps the returned url for immediate preview", async () => {
		const Wrap = clientWrapper(() => new Response("{}"));
		function Harness() {
			const [value, setValue] = useState<UploadValue | string | null>(null);
			return (
				<UploadForm
					name="file"
					value={value}
					onChange={(next) => setValue(next as UploadValue | string | null)}
					options={{
						upload: async () => uploadResponse("uploads/hello.png", "/signed/hello"),
					}}
				/>
			);
		}
		const { container, findByRole } = render(
			<Wrap>
				<Harness />
			</Wrap>,
		);
		const file = new File(["x"], "hello.png", { type: "image/png" });
		const input = container.querySelector("input[type=file]") as HTMLInputElement;

		await userEvent.upload(input, file);

		const img = await findByRole("img");
		expect(img.getAttribute("src")).toBe("/signed/hello");
	});

	test("Upload surfaces a server error message and does not call onChange", async () => {
		const Wrap = clientWrapper(() => new Response("{}"));
		const captured: (UploadValue | UploadValue[] | string | string[] | null)[] = [];
		const { container, getByRole } = render(
			<Wrap>
				<UploadForm
					name="file"
					value={null}
					onChange={(v) => captured.push(v)}
					options={{
						upload: async () => {
							throw new Error("File too large");
						},
					}}
				/>
			</Wrap>,
		);
		const file = new File(["x"], "huge.png", { type: "image/png" });
		const input = container.querySelector("input[type=file]") as HTMLInputElement;
		await userEvent.upload(input, file);
		await waitFor(() => expect(getByRole("alert").textContent).toContain("File too large"));
		expect(captured).toHaveLength(0);
	});

	test("Upload with a value renders preview and clears to null on remove", async () => {
		const Wrap = clientWrapper(() => new Response("{}"));
		const captured: (UploadValue | UploadValue[] | string | string[] | null)[] = [];
		const { getByRole, getByText } = render(
			<Wrap>
				<UploadForm
					name="file"
					value={SAMPLE}
					onChange={(v) => captured.push(v)}
					options={{ upload: async () => uploadResponse() }}
				/>
			</Wrap>,
		);
		expect(getByText("pic.png")).toBeTruthy();
		await userEvent.click(getByRole("button", { name: /remove/i }));
		expect(captured.at(-1)).toBeNull();
	});

	test("Upload uses the injected upload closure and emits preview data", async () => {
		const seen: File[] = [];
		const row = { path: "uploads/doc.png", url: "/uploads/doc.png" };
		const captured: (UploadValue | UploadValue[] | string | string[] | null)[] = [];
		const Wrap = clientWrapper(() => new Response("{}"));
		const { container } = render(
			<Wrap>
				<UploadForm
					name="file"
					value={null}
					onChange={(v) => captured.push(v)}
					options={{
						upload: async (_ctx, file) => {
							seen.push(file);
							return { data: row };
						},
					}}
				/>
			</Wrap>,
		);
		const file = new File(["x"], "doc.png", { type: "image/png" });
		const input = container.querySelector("input[type=file]") as HTMLInputElement;
		await userEvent.upload(input, file);
		await waitFor(() => expect(captured.length).toBeGreaterThan(0));
		expect(seen[0]).toBe(file);
		expect(captured.at(-1)).toEqual(row);
	});

	test("Upload accept attribute forwards to the file input", () => {
		const Wrap = clientWrapper(() => new Response("{}"));
		const { container } = render(
			<Wrap>
				<UploadForm
					name="file"
					value={null}
					onChange={() => {}}
					options={{ accept: "image/*", upload: async () => uploadResponse() }}
				/>
			</Wrap>,
		);
		const input = container.querySelector("input[type=file]") as HTMLInputElement;
		expect(input.getAttribute("accept")).toBe("image/*");
	});

	test("Upload tolerates a plain string value without crashing", () => {
		const Wrap = clientWrapper(() => new Response("{}"));
		const { getByText } = render(
			<Wrap>
				<UploadForm
					name="file"
					value="uploads/legacy.png"
					onChange={() => {}}
					options={{ upload: async () => uploadResponse() }}
				/>
			</Wrap>,
		);
		expect(getByText("legacy.png")).toBeTruthy();
	});
});

describe("UploadCell", () => {
	test("UploadCell with an image row renders an img with the row url", () => {
		const row = { path: "uploads/a.png", url: "/u/a.png" };
		const { container } = render(
			<RowProvider value={row}>
				<UploadCell value={SAMPLE} />
			</RowProvider>,
		);
		const img = container.querySelector("img");
		expect(img?.getAttribute("src")).toBe("/u/a.png");
	});

	test("UploadCell with a non-image row renders the filename", () => {
		const row = { path: "uploads/a.pdf", url: "/u/a.pdf" };
		const { container } = render(
			<RowProvider value={row}>
				<UploadCell value={null} />
			</RowProvider>,
		);
		expect(container.textContent).toContain("a.pdf");
	});

	test("UploadCell with no value and no row renders nothing", () => {
		const { container } = render(<UploadCell value={null} />);
		expect(container.textContent).toBe("");
	});

	test("UploadCell with a string path renders the basename", () => {
		const { container } = render(<UploadCell value="uploads/report.pdf" />);
		expect(container.textContent).toContain("report.pdf");
	});
});

describe("basename", () => {
	test("returns the last path segment", () => {
		expect(basename("uploads/pic.png")).toBe("pic.png");
		expect(basename("pic.png")).toBe("pic.png");
	});
});
