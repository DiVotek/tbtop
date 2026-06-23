import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { AuthUserProvider } from "../../app/authUser";
import { compileCondition } from "../../inertia/conditionCompiler";
import { RowProvider } from "../rowContext";
import { wrapForStructure } from "../testFixtures";
import type { ActionConfig, AuthUser } from "../types";
import { type RowActionEntry, RowActionsCell } from "./rowActions";

const Wrap = wrapForStructure(() => new Response("{}"));

function renderCell(
	actions: RowActionEntry[],
	row: Record<string, unknown>,
	user: AuthUser | null = null,
) {
	const ui: ReactNode = (
		<Wrap>
			<AuthUserProvider user={user}>
				<RowProvider value={row}>
					<table>
						<tbody>
							<tr>
								<td>
									<RowActionsCell actions={actions} />
								</td>
							</tr>
						</tbody>
					</table>
				</RowProvider>
			</AuthUserProvider>
		</Wrap>
	);
	return render(ui);
}

// Handler (button) actions, not url/Link — the hidden/disabled filtering under
// test is independent of action type, and Inertia <Link> is flaky under happy-dom.
const visitAction = (name: string, extra: Partial<ActionConfig> = {}): ActionConfig =>
	({ name, label: name, handler: async () => {}, ...extra }) as ActionConfig;

describe("RowActionsCell — hiddenIf filters per row", () => {
	test("action with hiddenIf(status=done) is present when status is pending", () => {
		const action = visitAction("approve", {
			meta: { hidden: compileCondition({ op: "eq", field: "status", value: "done" }) },
		});
		const { queryByTestId } = renderCell([action], { status: "pending" });
		expect(queryByTestId("action-approve")).not.toBeNull();
	});

	test("action with hiddenIf(status=done) is absent when status is done", () => {
		const action = visitAction("approve", {
			meta: { hidden: compileCondition({ op: "eq", field: "status", value: "done" }) },
		});
		const { queryByTestId } = renderCell([action], { status: "done" });
		expect(queryByTestId("action-approve")).toBeNull();
	});
});

describe("RowActionsCell — role-gated via user", () => {
	const managerOnly = visitAction("manage", {
		meta: { hidden: compileCondition({ op: "eq", field: "$user.role", value: "manager" }) },
	});

	test("hidden for a manager user", () => {
		const user = { id: "1", email: "m@x.io", role: "manager" } as unknown as AuthUser;
		const { queryByTestId } = renderCell([managerOnly], { status: "x" }, user);
		expect(queryByTestId("action-manage")).toBeNull();
	});

	test("shown for an admin user", () => {
		const user = { id: "2", email: "a@x.io", role: "admin" } as unknown as AuthUser;
		const { queryByTestId } = renderCell([managerOnly], { status: "x" }, user);
		expect(queryByTestId("action-manage")).not.toBeNull();
	});
});

describe("RowActionsCell — disabledIf disables the button", () => {
	test("disabledIf(locked truthy) renders a disabled button", () => {
		const action = visitAction("delete", {
			meta: { disabled: compileCondition({ op: "truthy", field: "locked" }) },
		});
		const { getByTestId } = renderCell([action], { locked: true });
		expect(getByTestId("action-delete").hasAttribute("disabled")).toBe(true);
	});

	test("disabledIf(locked truthy) leaves the button enabled when not locked", () => {
		const action = visitAction("delete", {
			meta: { disabled: compileCondition({ op: "truthy", field: "locked" }) },
		});
		const { getByTestId } = renderCell([action], { locked: false });
		expect(getByTestId("action-delete").hasAttribute("disabled")).toBe(false);
	});
});

describe("RowActionsCell — explicit dropdown, no auto-collapse", () => {
	test("renders every action inline regardless of count (no implicit dropdown)", () => {
		const { getByTestId, queryByTestId } = renderCell(
			[visitAction("a"), visitAction("b"), visitAction("c")],
			{ id: "1" },
		);
		expect(getByTestId("action-a")).not.toBeNull();
		expect(getByTestId("action-b")).not.toBeNull();
		expect(getByTestId("action-c")).not.toBeNull();
		expect(queryByTestId("row-actions-trigger")).toBeNull();
		expect(queryByTestId("action-group-trigger")).toBeNull();
	});

	test("an explicit dropdown group renders a menu trigger with children collapsed", () => {
		const group: RowActionEntry = {
			kind: "actionGroup",
			label: "More",
			children: [
				{
					kind: "action",
					name: "edit",
					options: { name: "edit", label: "Edit", handler: async () => {} },
					meta: {},
				},
				{
					kind: "action",
					name: "del",
					options: { name: "del", label: "Delete", handler: async () => {} },
					meta: {},
				},
			],
		};
		const { getByTestId, queryByTestId } = renderCell([group], { id: "1" });
		expect(getByTestId("action-group-trigger")).not.toBeNull();
		expect(queryByTestId("action-edit")).toBeNull();
	});
});
