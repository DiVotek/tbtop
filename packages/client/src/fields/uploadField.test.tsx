import { describe, expect, mock, test } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
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

	test("Upload retries when the same file is selected after an error", async () => {
		const Wrap = clientWrapper(() => new Response("{}"));
		let attempts = 0;
		const { container, getByRole } = render(
			<Wrap>
				<UploadForm
					name="file"
					value={null}
					onChange={() => {}}
					options={{
						upload: async () => {
							attempts += 1;
							throw new Error("Upload failed");
						},
					}}
				/>
			</Wrap>,
		);
		const input = container.querySelector("input[type=file]") as HTMLInputElement;
		const file = new File(["x"], "retry.png", { type: "image/png" });

		await userEvent.upload(input, file);
		await waitFor(() => expect(getByRole("alert").textContent).toContain("Upload failed"));
		await userEvent.upload(input, file);

		await waitFor(() => expect(attempts).toBe(2));
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

	test("Upload disabled with a value shows the preview but the remove control cannot clear it", async () => {
		const Wrap = clientWrapper(() => new Response("{}"));
		const captured: (UploadValue | UploadValue[] | string | string[] | null)[] = [];
		const { getByRole, getByText } = render(
			<Wrap>
				<UploadForm
					name="file"
					value={SAMPLE}
					onChange={(v) => captured.push(v)}
					disabled
					options={{ upload: async () => uploadResponse() }}
				/>
			</Wrap>,
		);
		expect(getByText("pic.png")).toBeTruthy();
		const removeButton = getByRole("button", { name: /remove/i }) as HTMLButtonElement;
		expect(removeButton.disabled).toBe(true);
		await userEvent.click(removeButton);
		expect(captured).toHaveLength(0);
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

	test("Upload forwards validation and blur props to the file input", () => {
		const Wrap = clientWrapper(() => new Response("{}"));
		const onBlur = mock(() => {});
		const { container } = render(
			<Wrap>
				<UploadForm
					name="file"
					value={null}
					onChange={() => {}}
					onBlur={onBlur}
					invalid
					describedBy="file-error"
				/>
			</Wrap>,
		);
		const input = container.querySelector("input[type=file]") as HTMLInputElement;
		expect(input.getAttribute("aria-invalid")).toBe("true");
		expect(input.getAttribute("aria-describedby")).toBe("file-error");
		fireEvent.blur(input);
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	test("Upload with a value keeps a labelled file input that owns validation state", () => {
		const Wrap = clientWrapper(() => new Response("{}"));
		const onBlur = mock(() => {});
		const { container, getByLabelText, getByRole } = render(
			<Wrap>
				<label htmlFor="file">Attachment</label>
				<UploadForm
					name="file"
					value={SAMPLE}
					onChange={() => {}}
					onBlur={onBlur}
					invalid
					describedBy="file-error"
					options={{ accept: "image/*", upload: async () => uploadResponse() }}
				/>
				<p id="file-error">File is required</p>
			</Wrap>,
		);
		const input = getByLabelText("Attachment") as HTMLInputElement;
		expect(getByLabelText("Replace")).toBe(input);
		expect(input.type).toBe("file");
		expect(input.getAttribute("accept")).toBe("image/*");
		expect(input.getAttribute("aria-invalid")).toBe("true");
		expect(input.getAttribute("aria-describedby")).toBe("file-filename file-error");
		expect(container.querySelector("#file-filename")?.textContent).toBe("pic.png");
		fireEvent.blur(input);
		expect(onBlur).toHaveBeenCalledTimes(1);

		const removeButton = getByRole("button", { name: /remove/i });
		expect(removeButton.hasAttribute("aria-invalid")).toBe(false);
		expect(removeButton.hasAttribute("aria-describedby")).toBe(false);
	});

	test("Upload with a value replaces the file through the preview input", async () => {
		const Wrap = clientWrapper(() => new Response("{}"));
		const captured: (UploadValue | UploadValue[] | string | string[] | null)[] = [];
		const { container } = render(
			<Wrap>
				<UploadForm
					name="file"
					value={SAMPLE}
					onChange={(v) => captured.push(v)}
					options={{
						upload: async () => uploadResponse("uploads/next.png", "/uploads/next.png"),
					}}
				/>
			</Wrap>,
		);
		const input = container.querySelector("input[type=file]") as HTMLInputElement;
		await userEvent.upload(input, new File(["x"], "next.png", { type: "image/png" }));
		await waitFor(() => expect(captured.length).toBeGreaterThan(0));
		expect(captured.at(-1)).toEqual({ path: "uploads/next.png", url: "/uploads/next.png" });
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
	test("UploadCell with an image value renders an img with its own url", () => {
		const { container } = render(<UploadCell value={SAMPLE} />);
		expect(container.querySelector("img")?.getAttribute("src")).toBe("/uploads/pic.png");
	});

	test("UploadCell ignores sibling row fields for a string path", () => {
		const row = { path: "uploads/a.png", url: "/u/a.png" };
		const { container } = render(
			<RowProvider value={row}>
				<UploadCell value="uploads/report.pdf" />
			</RowProvider>,
		);
		expect(container.querySelector("img")).toBeNull();
		expect(container.textContent).toBe("report.pdf");
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
