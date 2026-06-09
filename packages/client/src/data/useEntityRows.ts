import { useCallback, useEffect, useState } from "react";
import { type AdminClient, useClient } from "./client";
import { collection } from "./entityRoutes";
import { isTabletopError } from "./envelope";

export type Row = Record<string, unknown> & { id: string };

export type RowsState =
	| { kind: "loading" }
	| { kind: "loaded"; rows: Row[]; total: number; refetch: () => void }
	| { kind: "error"; message: string; refetch: () => void };

interface ListBody {
	data?: Row[];
	total?: number;
}

export function useEntityRows(entityName: string): RowsState {
	const client = useClient();
	const [tick, setTick] = useState(0);
	const refetch = useCallback(() => setTick((t) => t + 1), []);
	const [state, setState] = useState<RowsState>({ kind: "loading" });

	// biome-ignore lint/correctness/useExhaustiveDependencies: tick is the refetch trigger
	useEffect(() => {
		let cancelled = false;
		setState({ kind: "loading" });
		fetchRows(client, entityName).then((result) => {
			if (!cancelled) {
				setState(withRefetch(result, refetch));
			}
		});
		return () => {
			cancelled = true;
		};
	}, [client, entityName, tick, refetch]);

	return state;
}

interface RowsResult {
	rows: Row[];
	total: number;
	error: string | null;
}

async function fetchRows(client: AdminClient, entityName: string): Promise<RowsResult> {
	try {
		const body = (await collection(client, entityName).list()) as ListBody | null;
		const rows = Array.isArray(body?.data) ? body.data : [];
		return { rows, total: body?.total ?? rows.length, error: null };
	} catch (err) {
		return { rows: [], total: 0, error: errorMessage(err) };
	}
}

function errorMessage(err: unknown): string {
	if (isTabletopError(err)) {
		return err.message;
	}
	return err instanceof Error ? err.message : String(err);
}

function withRefetch(result: RowsResult, refetch: () => void): RowsState {
	if (result.error) {
		return { kind: "error", message: result.error, refetch };
	}
	return { kind: "loaded", rows: result.rows, total: result.total, refetch };
}
