import type { ClientActionContext } from "../structure/types";

type Bag = Record<string, unknown>;

/**
 * Binds a `creatable()` mini-form's `post` to its endpoint. `deps` travels in
 * the body for a dependent relation; the server filters it to `dependsOn()`.
 */
export function bindCreatePost(create: Bag, endpoint: string): Bag {
	return {
		...create,
		post: (actionCtx: ClientActionContext, data: Bag, deps?: Record<string, string>) =>
			actionCtx.client.post(endpoint, { ...data, deps }),
	};
}
