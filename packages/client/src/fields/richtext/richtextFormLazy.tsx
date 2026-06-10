import { lazy, Suspense } from "react";
import type { FieldFormProps } from "../fieldProps";
import type { RichtextValue } from "./richtextCell";

// Lazily import the heavy Lexical bundle only when a richtext form is first
// rendered — keeps Lexical out of the static module graph so other fields and
// tests that never render richtext are not affected.
const LazyForm = lazy(() => import("./richtextField").then((m) => ({ default: m.RichtextForm })));

interface RichtextOptionsBag {
	placeholder?: string;
}

export function RichtextFormLazy(props: FieldFormProps<RichtextValue, RichtextOptionsBag>) {
	return (
		<Suspense fallback={<div className="h-40 rounded-md border bg-muted animate-pulse" />}>
			<LazyForm {...props} />
		</Suspense>
	);
}
