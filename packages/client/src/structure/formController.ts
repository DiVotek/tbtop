import { useCallback, useMemo, useRef, useState } from "react";
import { useReconciled } from "../lib/useReconciled";
import type { FormController, FormSubmission } from "./types";

type Bag = Record<string, unknown>;

interface UseFormControllerInput {
	initial: Bag;
	schema?: { parse: (input: unknown) => unknown };
}

export interface FormControllerInternal extends FormController {
	syncInitial: (record: Bag) => void;
	touched: Set<string>;
	fieldErrors: Record<string, string>;
	schema: { parse: (input: unknown) => unknown } | undefined;
	markTouched: (field: string) => void;
	setFieldError: (field: string, message: string | null) => void;
	resetTouched: () => void;
	/** Incremented each time errors are applied after a failed submit — triggers scroll-to-error. */
	errorScrollTick: number;
	notifyErrorsApplied: () => void;
	/**
	 * Applies a whole-bag transform in one state update — for a caller (the
	 * dependent-field cascade) that computes several field changes together
	 * and must commit them as a single data change, not one `set` per field.
	 */
	setMany: (mutate: (data: Bag) => Bag) => void;
}

// oxlint-disable-next-line max-lines-per-function -- hook: 5 useCallbacks must stay inline (hook rules)
export function useFormController(input: UseFormControllerInput): FormControllerInternal {
	const baselineRef = useRef(input.initial);
	// A fresh but deep-equal record (every Inertia props refresh delivers one)
	// must not reset the baseline the user's edits are measured against.
	const source = useReconciled(input.initial, { isEqual });
	if (source.changed) {
		source.accept();
		baselineRef.current = input.initial;
	}
	const [initial, setInitial] = useState<Bag>(() => ({ ...input.initial }));
	const [data, setData] = useState<Bag>(() => ({ ...input.initial }));
	const [touched, setTouched] = useState<Set<string>>(() => new Set());
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [errorScrollTick, setErrorScrollTick] = useState(0);

	const set = useCallback((field: string, value: unknown) => {
		setData((prev) => ({ ...prev, [field]: value }));
	}, []);

	const setMany = useCallback((mutate: (prev: Bag) => Bag) => {
		setData(mutate);
	}, []);

	const reset = useCallback((values?: Bag, submitted?: Bag) => {
		const next = values ?? baselineRef.current;
		baselineRef.current = next;
		setInitial({ ...next });
		setData((current) => (submitted ? rebaseEdits(next, submitted, current) : { ...next }));
		setTouched(new Set());
		setFieldErrors({});
	}, []);
	const { beginSubmit, syncInitial } = useSubmission(input.initial, data, reset);

	const markTouched = useCallback((field: string) => {
		setTouched((prev) => {
			if (prev.has(field)) {
				return prev;
			}
			return new Set(prev).add(field);
		});
	}, []);

	const setFieldError = useCallback((field: string, message: string | null) => {
		setFieldErrors((prev) => {
			const next = { ...prev };
			if (message === null) {
				delete next[field];
			} else {
				next[field] = message;
			}
			return next;
		});
	}, []);

	const resetTouched = useCallback(() => setTouched(new Set()), []);

	const notifyErrorsApplied = useCallback(() => {
		setErrorScrollTick((t) => t + 1);
	}, []);

	const changedFields = useMemo(() => diffKeys(initial, data), [initial, data]);
	const isDirty = changedFields.length > 0;
	const isValid = Object.keys(fieldErrors).length === 0;

	return {
		initial,
		data,
		isDirty,
		isValid,
		changedFields,
		set,
		setMany,
		reset,
		beginSubmit,
		syncInitial,
		touched,
		fieldErrors,
		schema: input.schema,
		markTouched,
		setFieldError,
		resetTouched,
		errorScrollTick,
		notifyErrorsApplied,
	};
}

interface PendingSubmission extends FormSubmission {
	data: Bag;
	record?: Bag;
}

function useSubmission(record: Bag, data: Bag, reset: (values: Bag, submitted?: Bag) => void) {
	const active = useRef<PendingSubmission | null>(null);
	const settledRecord = useRef<Bag | null>(null);
	const beginSubmit = useCallback(() => {
		const submission: PendingSubmission = {
			data,
			prepare(refreshed) {
				if (refreshed && !isEqual(record, refreshed)) {
					submission.record = refreshed;
				}
			},
			commit(saved) {
				if (active.current !== submission) {
					return;
				}
				// Inertia can deliver the refreshed record on either side of onSuccess.
				settledRecord.current = submission.record ?? null;
				reset(submission.record ?? saved, data);
			},
			finish() {
				if (active.current === submission) {
					active.current = null;
				}
			},
		};
		active.current = submission;
		return submission;
	}, [data, record, reset]);
	const syncInitial = useCallback(
		(next: Bag) => {
			const alreadySettled = isEqual(next, settledRecord.current);
			settledRecord.current = null;
			if (!alreadySettled) {
				const pending = active.current;
				reset(next, pending && isEqual(next, pending.record) ? pending.data : undefined);
			}
		},
		[reset],
	);
	return { beginSubmit, syncInitial };
}

function rebaseEdits(saved: Bag, submitted: Bag, current: Bag): Bag {
	const next = { ...saved };
	for (const key of diffKeys(submitted, current)) {
		if (Object.hasOwn(current, key)) {
			next[key] = current[key];
		} else {
			delete next[key];
		}
	}
	return next;
}

function diffKeys(initial: Bag, data: Bag): string[] {
	const keys = new Set([...Object.keys(initial), ...Object.keys(data)]);
	const out: string[] = [];
	for (const key of keys) {
		if (!isEqual(initial[key], data[key])) {
			out.push(key);
		}
	}
	return out;
}

/** Value equality for form bags — JSON-shaped data only. */
export function isEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) {
		return true;
	}
	return JSON.stringify(a) === JSON.stringify(b);
}
