import { useCallback, useMemo, useRef, useState } from "react";
import type { FormController } from "./types";

type Bag = Record<string, unknown>;

interface UseFormControllerInput {
	initial: Bag;
	schema?: { parse: (input: unknown) => unknown };
}

interface FormControllerInternal extends FormController {
	touched: Set<string>;
	fieldErrors: Record<string, string>;
	schema: { parse: (input: unknown) => unknown } | undefined;
	markTouched: (field: string) => void;
	setFieldError: (field: string, message: string | null) => void;
	resetTouched: () => void;
	/** Incremented each time errors are applied after a failed submit — triggers scroll-to-error. */
	errorScrollTick: number;
	notifyErrorsApplied: () => void;
}

// oxlint-disable-next-line max-lines-per-function -- hook: 5 useCallbacks must stay inline (hook rules)
export function useFormController(input: UseFormControllerInput): FormControllerInternal {
	const initialRef = useRef(input.initial);
	initialRef.current = input.initial;
	const [data, setData] = useState<Bag>(() => ({ ...input.initial }));
	const [touched, setTouched] = useState<Set<string>>(() => new Set());
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [errorScrollTick, setErrorScrollTick] = useState(0);

	const set = useCallback((field: string, value: unknown) => {
		setData((prev) => ({ ...prev, [field]: value }));
	}, []);

	const reset = useCallback(() => {
		setData({ ...initialRef.current });
		setTouched(new Set());
		setFieldErrors({});
	}, []);

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

	const changedFields = useMemo(() => diffKeys(input.initial, data), [input.initial, data]);
	const isDirty = changedFields.length > 0;
	const isValid = Object.keys(fieldErrors).length === 0;

	return {
		initial: input.initial,
		data,
		isDirty,
		isValid,
		changedFields,
		set,
		reset,
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

function isEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) {
		return true;
	}
	return JSON.stringify(a) === JSON.stringify(b);
}
