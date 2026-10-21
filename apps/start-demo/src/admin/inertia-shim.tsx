/**
 * `@inertiajs/react` on top of TanStack Router — just the surface the tbtop
 * client uses: `usePage`, `router.{visit,post,reload,on}`, `Link`, `Head`.
 *
 * In a real port this file becomes a transport seam inside the client
 * (`AdminTransport`), not an alias; it is an alias here to prove the client
 * runs unchanged.
 */
import { useRouter, useRouterState } from "@tanstack/react-router";
import type { AdminPageProps } from "@tbtop/admin-node";
import {
	type AnchorHTMLAttributes,
	createContext,
	type MouseEvent,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

type Flash = Record<string, unknown>;
interface Page {
	component: string;
	props: AdminPageProps & Record<string, unknown>;
	url: string;
	flash: Flash;
}

interface Visit {
	url: string;
	method: "get" | "post";
	[option: string]: unknown;
}

type BeforeListener = (event: { detail: { visit: Visit } }) => boolean | void;
type Listener = (event: unknown) => void;

interface Bound {
	navigate: (href: string, replace: boolean) => Promise<void>;
	invalidate: () => Promise<void>;
	setFlash: (flash: Flash) => void;
}

let bound: Bound | null = null;
const listeners = { before: new Set<BeforeListener>(), navigate: new Set<Listener>() };

/** Inertia's 'before' event: any listener returning false cancels the visit. */
function cancelled(visit: Visit): boolean {
	return [...listeners.before].some((cb) => cb({ detail: { visit } }) === false);
}

const PageContext = createContext<Page | null>(null);

export function usePage<P = Record<string, unknown>>(): Page & { props: P } {
	const page = useContext(PageContext);
	if (!page) {
		throw new Error("usePage() outside <InertiaShim>");
	}
	return page as Page & { props: P };
}

interface PostOptions {
	onSuccess?: (page: { flash: Flash }) => void;
	onError?: (errors: Record<string, string>) => void;
	onFinish?: () => void;
	[option: string]: unknown;
}

export const router = {
	on(event: "before" | "navigate", cb: BeforeListener | Listener): () => void {
		const set = listeners[event] as Set<typeof cb>;
		set.add(cb);
		return () => set.delete(cb);
	},

	visit(url: string, options: Record<string, unknown> = {}): void {
		const visit: Visit = { url, method: "get", ...options };
		if (cancelled(visit)) {
			return;
		}
		void bound?.navigate(url, options.replace === true).then(() => {
			for (const cb of listeners.navigate) {
				cb({ detail: { page: { url } } });
			}
		});
	},

	/** Inertia's form POST: 422 → errors bag; 2xx → `{effects}` delivered as flash, then the page reloads its props. */
	async post(url: string, data: unknown = {}, options: PostOptions = {}): Promise<void> {
		const visit: Visit = { url, method: "post", ...options };
		if (cancelled(visit)) {
			return;
		}
		try {
			const res = await fetch(url, {
				method: "POST",
				headers: { "content-type": "application/json", accept: "application/json" },
				body: JSON.stringify(data),
			});
			const body = (await res.json().catch(() => ({}))) as { effects?: unknown; errors?: Record<string, string[]> };
			if (res.status === 422) {
				const errors = Object.fromEntries(Object.entries(body.errors ?? {}).map(([k, v]) => [k, v[0] ?? ""]));
				options.onError?.(errors);
				return;
			}
			const flash = { "tbtop.effects": body.effects ?? [] };
			await bound?.invalidate();
			bound?.setFlash(flash);
			options.onSuccess?.({ flash });
		} finally {
			options.onFinish?.();
		}
	},

	reload(): void {
		void bound?.invalidate();
	},
};

export function Link({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
	const handle = (event: MouseEvent<HTMLAnchorElement>) => {
		onClick?.(event);
		if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || rest.target === "_blank") {
			return;
		}
		event.preventDefault();
		router.visit(href);
	};
	return <a href={href} onClick={handle} {...rest} />;
}

/** Title lives in the route's `head()`; Inertia's <Head> becomes a no-op. */
export function Head(_: { title?: string; children?: ReactNode }) {
	return null;
}

export function InertiaShim({ props, children }: { props: AdminPageProps; children: ReactNode }) {
	const tsRouter = useRouter();
	const location = useRouterState({ select: (s) => s.location });
	const [flash, setFlash] = useState<Flash>({});

	useEffect(() => {
		bound = {
			navigate: (href, replace) => tsRouter.navigate({ href, replace }),
			invalidate: () => tsRouter.invalidate(),
			setFlash,
		};
		return () => {
			bound = null;
		};
	}, [tsRouter]);

	const url = location.href;
	const page = useMemo<Page>(
		() => ({ component: "admin/page", props: props as Page["props"], url, flash }),
		[props, url, flash],
	);
	return <PageContext.Provider value={page}>{children}</PageContext.Provider>;
}
