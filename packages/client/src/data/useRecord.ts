import { useEffect, useState } from "react";
import { type AdminClient, useClient } from "./client";
import { item, single } from "./entityRoutes";
import { isTabletopError, unwrapData } from "./envelope";

export type RecordState =
	| { kind: "loading" }
	| { kind: "loaded"; record: Record<string, unknown> }
	| { kind: "not-found" }
	| { kind: "error"; message: string };

export function useRecord(entityName: string, id: string): RecordState {
	const client = useClient();
	const [state, setState] = useState<RecordState>({ kind: "loading" });

	useEffect(() => {
		if (!id) {
			return;
		}
		let cancelled = false;
		fetchOne(client, entityName, id).then((next) => {
			if (!cancelled) {
				setState(next);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [client, entityName, id]);

	return state;
}

export function useSingleRecord(entityName: string): RecordState {
	const client = useClient();
	const [state, setState] = useState<RecordState>({ kind: "loading" });

	useEffect(() => {
		if (!entityName) {
			return;
		}
		let cancelled = false;
		fetchSingle(client, entityName).then((next) => {
			if (!cancelled) {
				setState(next);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [client, entityName]);

	return state;
}

async function fetchOne(client: AdminClient, entityName: string, id: string): Promise<RecordState> {
	try {
		return toLoaded(await item(client, entityName).get(id));
	} catch (err) {
		return toErrorState(err);
	}
}

async function fetchSingle(client: AdminClient, entityName: string): Promise<RecordState> {
	try {
		const raw = await single(client, entityName).get();
		if (unwrapData(raw) === null || unwrapData(raw) === undefined) {
			return { kind: "loaded", record: {} };
		}
		return toLoaded(raw);
	} catch (err) {
		return toErrorState(err);
	}
}

function toLoaded(raw: unknown): RecordState {
	const record = unwrapData(raw);
	if (record && typeof record === "object") {
		return { kind: "loaded", record: record as Record<string, unknown> };
	}
	return { kind: "error", message: "unknown error" };
}

function toErrorState(err: unknown): RecordState {
	if (isTabletopError(err) && err.status === 404) {
		return { kind: "not-found" };
	}
	if (isTabletopError(err)) {
		return { kind: "error", message: err.message };
	}
	return { kind: "error", message: err instanceof Error ? err.message : "unknown error" };
}
