import { useMemo } from "react";
import { toast } from "sonner";
import { useAuthUser } from "../app/authUser";
import { useNavigate } from "../app/navigate";
import { useParams } from "../app/pageParams";
import { useClient } from "../data/client";
import { useTranslation } from "../i18n/i18n";
import { useNearestFormHandle } from "./formContext";
import type { FormControllerInternal } from "./formController";
import { useNearestModal } from "./modalContext";
import { useNearestRow } from "./rowContext";
import { useNearestTableController } from "./tableContext";
import type {
	ClientActionContext,
	FormController,
	NotificationConfig,
	TableController,
} from "./types";

export function useClientActionContext(): ClientActionContext {
	const client = useClient();
	const navigate = useNavigate();
	const params = useParams();
	const t = useTranslation();
	const formHandle = useNearestFormHandle();
	const tableHandle = useNearestTableController();
	const row = useNearestRow();
	const modal = useNearestModal();
	const user = useAuthUser();

	return useMemo(() => {
		const formCtl = formHandle ? toFormController(formHandle) : undefined;
		const tableCtl = tableHandle ? toTableController(tableHandle) : undefined;
		return {
			client,
			user,
			params,
			navigate: (path) => navigate(path),
			notify: (msg) => emitNotification(msg),
			t,
			form: formCtl,
			table: tableCtl,
			row: row ?? undefined,
			modal: modal ?? undefined,
		};
	}, [client, navigate, params, t, formHandle, tableHandle, row, modal, user]);
}

function toTableController(handle: TableController): TableController {
	return {
		rows: handle.rows,
		selectedIds: handle.selectedIds,
		queryParams: handle.queryParams,
		refresh: handle.refresh,
		setQuery: handle.setQuery,
	};
}

function toFormController(handle: FormControllerInternal): FormController {
	return {
		initial: handle.initial,
		data: handle.data,
		isDirty: handle.isDirty,
		isValid: handle.isValid,
		changedFields: handle.changedFields,
		fieldErrors: handle.fieldErrors,
		set: handle.set,
		reset: handle.reset,
		setFieldError: handle.setFieldError,
	};
}

function emitNotification(msg: NotificationConfig): void {
	const kind = msg.kind ?? "info";
	if (kind === "error") {
		toast.error(msg.message);
	} else if (kind === "success") {
		toast.success(msg.message);
	} else if (kind === "warning") {
		toast.warning(msg.message);
	} else {
		toast(msg.message);
	}
}
