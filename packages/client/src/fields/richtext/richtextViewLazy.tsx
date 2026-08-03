import type { SerializedEditorState } from "lexical";
import { lazy, type ReactNode, Suspense } from "react";

// Lazily import the Lexical view so the heavy editor bundle stays out of the
// static graph — mirrors richtextFormLazy. Renders nothing until resolved.
const LazyView = lazy(() => import("./richtextView").then((m) => ({ default: m.RichtextView })));

const defaultFallback = <div className="h-20 rounded-md bg-muted animate-pulse" />;

export interface RichtextViewLazyProps {
	state: SerializedEditorState | string;
	fallback?: ReactNode;
}

export function RichtextViewLazy({ state, fallback = defaultFallback }: RichtextViewLazyProps) {
	return (
		<Suspense fallback={fallback}>
			<LazyView state={state} />
		</Suspense>
	);
}
