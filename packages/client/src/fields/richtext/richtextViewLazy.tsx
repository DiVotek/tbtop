import type { SerializedEditorState } from "lexical";
import { lazy, Suspense } from "react";

// Lazily import the Lexical view so the heavy editor bundle stays out of the
// static graph — mirrors richtextFormLazy. Renders nothing until resolved.
const LazyView = lazy(() => import("./richtextView").then((m) => ({ default: m.RichtextView })));

interface RichtextViewLazyProps {
	state: SerializedEditorState | string;
}

export function RichtextViewLazy({ state }: RichtextViewLazyProps) {
	return (
		<Suspense fallback={<div className="h-20 rounded-md bg-muted animate-pulse" />}>
			<LazyView state={state} />
		</Suspense>
	);
}
