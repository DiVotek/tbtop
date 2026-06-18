import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { AuthUserProvider } from "../../app/authUser";
import { compileCondition } from "../../inertia/conditionCompiler";
import { wrapForStructure } from "../testFixtures";
import type { ActionConfig, AuthUser } from "../types";
import { BulkActionsBar } from "./bulkActionsBar";

const Wrap = wrapForStructure(() => new Response("{}"));

function renderBar(actions: ActionConfig[], user: AuthUser | null) {
	const ui: ReactNode = (
		<Wrap>
			<AuthUserProvider user={user}>
				<BulkActionsBar actions={actions} selectedCount={2} />
			</AuthUserProvider>
		</Wrap>
	);
	return render(ui);
}

const managerHidden: ActionConfig = {
	name: "disable-user",
	label: "Disable user",
	handler: async () => {},
	meta: { hidden: compileCondition({ op: "eq", field: "$user.role", value: "manager" }) },
} as ActionConfig;

describe("BulkActionsBar — role-gated bulk actions", () => {
	test("bulk action hidden for a manager user", () => {
		const user = { id: "1", email: "m@x.io", role: "manager" } as unknown as AuthUser;
		const { queryByTestId } = renderBar([managerHidden], user);
		expect(queryByTestId("action-disable-user")).toBeNull();
	});

	test("bulk action shown for an admin user", () => {
		const user = { id: "2", email: "a@x.io", role: "admin" } as unknown as AuthUser;
		const { queryByTestId } = renderBar([managerHidden], user);
		expect(queryByTestId("action-disable-user")).not.toBeNull();
	});
});
