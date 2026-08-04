import { lazy, type ReactNode, Suspense } from "react";
import type { FieldFormProps } from "../fieldProps";
import type { RichtextValue } from "./richtextCell";

// Lazily import the heavy Lexical bundle only when a richtext form is first
// rendered — keeps Lexical out of the static module graph so other fields and
// tests that never render richtext are not affected.
const LazyForm = lazy(() => import("./richtextField").then((m) => ({ default: m.RichtextForm })));

const defaultFallback = <div className="h-40 rounded-md border bg-muted animate-pulse" />;

interface RichtextOptionsBag {
	placeholder?: string;
}

export interface RichtextFormLazyProps extends FieldFormProps<RichtextValue, RichtextOptionsBag> {
	fallback?: ReactNode;
}

export function RichtextFormLazy({ fallback = defaultFallback, ...props }: RichtextFormLazyProps) {
	return (
		<Suspense fallback={fallback}>
			<LazyForm {...props} />
		</Suspense>
	);
}
