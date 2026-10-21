import { currentContext } from "./dsl/context";

/** The server-side strings of `tbtop-admin::admin` (resources/lang/en/admin.php). */
export const EN_MESSAGES: Record<string, string> = {
	"action.save": "Save",
	"action.cancel": "Cancel",
	"action.delete": "Delete",
	"action.delete_selected": "Delete selected",
	"action.create": "Create",
	"action.edit": "Edit",
	"action.close": "Close",
	"action.done": "Done",
	"action.replicate": "Replicate",
	"action.restore": "Restore",
	"action.force_delete": "Delete permanently",
	"entity.create.success": "Created",
	"entity.update.success": "Saved",
	"create.title": "Create record",
	"edit.title": "Edit record",
	"delete.confirm.title": "Delete record?",
	"delete.confirm.bulk_title": "Delete selected records?",
	"delete.confirm.body": "This action cannot be undone.",
	"delete.notify.success": "Record deleted",
	"delete.notify.bulk_success": "Selected records deleted",
	"replicate.notify.success": "Record replicated",
	"restore.notify.success": "Restored",
	"restore.notify.bulk_success": "Restored selected",
	"force_delete.confirm.title": "Delete permanently?",
	"force_delete.confirm.body": "This cannot be undone.",
	"force_delete.notify.success": "Deleted permanently",
	"force_delete.notify.bulk_success": "Deleted selected permanently",
	"table.nothing_selected": "Nothing selected.",
	"table.tabs.active": "Active",
	"table.tabs.trashed": "Trashed",
	"table.tabs.all": "All",
	"nav.title": "Tabletop",
};

/** __('tbtop-admin::admin.<key>'): the request's messages, then English, then the key. */
export function trans(key: string): string {
	return currentContext().messages[key] ?? EN_MESSAGES[key] ?? key;
}
