import { type ChangeEvent, useLayoutEffect, useRef } from "react";
import { applyMask } from "../lib/mask";
import { Input } from "../ui/input";

interface MaskedInputProps {
	id?: string;
	name: string;
	mask: string;
	value: string;
	onChange: (next: string) => void;
	onBlur?: () => void;
	disabled?: boolean;
	className?: string;
	placeholder?: string;
}

export function MaskedInput({ mask, value, onChange, ...rest }: MaskedInputProps) {
	const ref = useRef<HTMLInputElement>(null);
	const caret = useRef<number | null>(null);

	useLayoutEffect(() => {
		if (caret.current !== null && ref.current) {
			ref.current.setSelectionRange(caret.current, caret.current);
			caret.current = null;
		}
	});

	function handleChange(e: ChangeEvent<HTMLInputElement>) {
		const raw = e.target.value;
		const pos = e.target.selectionStart ?? raw.length;
		caret.current = applyMask(raw.slice(0, pos), mask).length;
		onChange(applyMask(raw, mask));
	}

	return <Input ref={ref} value={applyMask(value, mask)} onChange={handleChange} {...rest} />;
}
