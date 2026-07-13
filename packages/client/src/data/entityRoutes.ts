import type { AdminClient, QueryParams } from "./client";

// One place owns the admin URL convention; hooks stay route-agnostic.
// The base is the Laravel admin prefix, hydrated from shared props.

let routesBase = "/admin";

export function setRoutesBase(prefix: string): void {
	routesBase = prefix.startsWith("/") ? prefix : `/${prefix}`;
}

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
	return `${routesBase}/${entityName}`;
}

export function itemPath(entityName: string, id: string): string {
	return `${routesBase}/${entityName}/${encodeURIComponent(id)}`;
}

export function uploadPath(profile: string): string {
	return `${routesBase}/uploads/${profile}`;
}

export function logoutPath(): string {
	return `${routesBase}/logout`;
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
