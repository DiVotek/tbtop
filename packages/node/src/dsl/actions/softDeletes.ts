import { trans } from "../../i18n";
import type { ActionBuilder } from "../action";
import { Effects } from "../effects";
import type { S } from "../s";
import { Tab } from "../table/tab";
import type { TableBuilder } from "../table/table";
import { RecordAction, type RecordFn } from "./record";

/**
 * What PHP's SoftDeletes gives Eloquent, for the host's query type: the three
 * scopes plus restore/forceDelete by key.
 */
export interface SoftDeleteDriver<Q> {
	active(query: Q): Q;
	trashed(query: Q): Q;
	withTrashed(query: Q): Q;
	restore(keys: (string | number)[]): unknown;
	forceDelete(keys: (string | number)[]): unknown;
}

const keyOf: (fn: (keys: (string | number)[]) => unknown) => RecordFn = (fn) => async (ctx) => {
	const key = ctx.key();
	await fn(key === null ? [] : [key]);
};
const selectionOf: (fn: (keys: (string | number)[]) => unknown) => RecordFn =
	(fn) => async (ctx) => {
		await fn(ctx.selection);
	};

/** Restore a trashed row or selection (RestoreAction.php). */
export const RestoreAction = {
	make(s: S, driver: SoftDeleteDriver<unknown>, name = "restore"): ActionBuilder {
		const tail = () => Effects.make().notify(trans("restore.notify.success")).refreshTable();
		return RecordAction.server(s, name, { using: keyOf(driver.restore), tail })
			.label(trans("action.restore"))
			.color("gray");
	},
	bulk(s: S, driver: SoftDeleteDriver<unknown>, name = "restoreSelected"): ActionBuilder {
		const tail = () =>
			Effects.make().notify(trans("restore.notify.bulk_success")).refreshTable();
		return RecordAction.bulk(s, name, { using: selectionOf(driver.restore), tail })
			.label(trans("action.restore"))
			.color("gray");
	},
};

/** Permanently delete a trashed row or selection (ForceDeleteAction.php). */
export const ForceDeleteAction = {
	make(s: S, driver: SoftDeleteDriver<unknown>, name = "forceDelete"): ActionBuilder {
		const tail = () =>
			Effects.make().notify(trans("force_delete.notify.success")).refreshTable();
		return confirmForce(
			RecordAction.server(s, name, { using: keyOf(driver.forceDelete), tail }),
		);
	},
	bulk(s: S, driver: SoftDeleteDriver<unknown>, name = "forceDeleteSelected"): ActionBuilder {
		const tail = () =>
			Effects.make().notify(trans("force_delete.notify.bulk_success")).refreshTable();
		return confirmForce(
			RecordAction.bulk(s, name, { using: selectionOf(driver.forceDelete), tail }),
		);
	},
};

function confirmForce(action: ActionBuilder): ActionBuilder {
	return action
		.label(trans("action.force_delete"))
		.color("danger")
		.confirm(trans("force_delete.confirm.title"), trans("force_delete.confirm.body"));
}

/**
 * Prepends active/trashed/all tabs and appends restore/force-delete row and
 * bulk actions; call after your own tabs()/rowActions()/bulkActions().
 */
export function softDeletes<Q>(
	table: TableBuilder<Q>,
	s: S,
	options: {
		driver: SoftDeleteDriver<Q>;
		rowActions?: boolean;
		bulkActions?: boolean;
		tabs?: boolean;
	},
): TableBuilder<Q> {
	const opts = { rowActions: true, bulkActions: true, tabs: true, ...options };
	const { driver } = options;
	const loose = driver as SoftDeleteDriver<unknown>;
	if (opts.tabs) {
		table.tabs([...trashedTabs(driver), ...table.tabObjects()]);
	}
	if (opts.rowActions) {
		const existing = (table.optionValue("rowActions") as unknown[] | undefined) ?? [];
		table.set("rowActions", [
			...existing,
			RestoreAction.make(s, loose),
			ForceDeleteAction.make(s, loose),
		]);
	}
	if (opts.bulkActions) {
		const existing = (table.optionValue("bulkActions") as unknown[] | undefined) ?? [];
		table.set("bulkActions", [
			...existing,
			RestoreAction.bulk(s, loose),
			ForceDeleteAction.bulk(s, loose),
		]);
	}
	return table;
}

function trashedTabs<Q>(driver: SoftDeleteDriver<Q>): Tab<Q>[] {
	return [
		Tab.make<Q>("active")
			.label(trans("table.tabs.active"))
			.query((q) => driver.active(q)),
		Tab.make<Q>("trashed")
			.label(trans("table.tabs.trashed"))
			.query((q) => driver.trashed(q)),
		Tab.make<Q>("withTrashed")
			.label(trans("table.tabs.all"))
			.query((q) => driver.withTrashed(q)),
	];
}
