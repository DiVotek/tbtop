import type { AdminClient, QueryParams } from "./client";

// Path-shape mirror of the old hc route helpers: one place owns the
// `/v1/<entity>` URL convention, hooks stay route-agnostic.

interface EntityCollectionRoutes {
	list: (query?: QueryParams) => Promise<unknown>;
	create: (body: Record<string, unknown>) => Promise<unknown>;
}

interface EntityItemRoutes {
	get: (id: string) => Promise<unknown>;
	update: (id: string, body: Record<string, unknown>) => Promise<unknown>;
	remove: (id: string) => Promise<unknown>;
}

interface SingleRoutes {
	get: () => Promise<unknown>;
	update: (body: Record<string, unknown>) => Promise<unknown>;
}

export function collectionPath(entityName: string): string {
	return `/v1/${entityName}`;
}

export function itemPath(entityName: string, id: string): string {
	return `/v1/${entityName}/${encodeURIComponent(id)}`;
}

export function uploadPath(entityName: string): string {
	return `/v1/${entityName}/upload`;
}

export function collection(client: AdminClient, entityName: string): EntityCollectionRoutes {
	return {
		list: (query) => client.get(collectionPath(entityName), query),
		create: (body) => client.post(collectionPath(entityName), body),
	};
}

export function item(client: AdminClient, entityName: string): EntityItemRoutes {
	return {
		get: (id) => client.get(itemPath(entityName, id)),
		update: (id, body) => client.patch(itemPath(entityName, id), body),
		remove: (id) => client.delete(itemPath(entityName, id)),
	};
}

export function single(client: AdminClient, entityName: string): SingleRoutes {
	return {
		get: () => client.get(collectionPath(entityName)),
		update: (body) => client.patch(collectionPath(entityName), body),
	};
}
