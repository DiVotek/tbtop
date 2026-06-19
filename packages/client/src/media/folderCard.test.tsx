/**
 * FolderCard tests — renders folder name + icon, single-click navigates.
 */
import { describe, expect, test } from "bun:test";
import { act, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FolderCard } from "./folderCard";
import type { MediaFolder } from "./types";

const FOLDER: MediaFolder = { id: "f7", name: "Invoices", parentId: null };

describe("FolderCard", () => {
	test("renders the folder name and a folder icon", () => {
		const { getByTestId, getByText } = render(
			<FolderCard folder={FOLDER} onSelect={() => {}} />,
		);
		const card = getByTestId("folder-card-f7");
		expect(getByText("Invoices")).toBeTruthy();
		expect(card.querySelector("svg")).toBeTruthy();
	});

	test("single-click calls onSelect with the folder id", async () => {
		const user = userEvent.setup({ delay: null });
		const selected: string[] = [];
		const { getByTestId } = render(
			<FolderCard folder={FOLDER} onSelect={(id) => selected.push(id)} />,
		);
		await act(async () => {
			await user.click(getByTestId("folder-card-f7"));
		});
		expect(selected).toEqual(["f7"]);
	});
});
