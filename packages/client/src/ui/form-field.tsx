import type { ReactNode } from "react";
import { useFormState } from "react-hook-form";
import { Label } from "./label";

export type FormFieldProps = {
	name: string;
	label?: ReactNode;
	htmlFor?: string;
	children: ReactNode;
};

export function FormField({ name, label, htmlFor, children }: FormFieldProps) {
	const id = htmlFor ?? name;
	return (
		<div className="flex flex-col gap-1.5">
			{label && <Label htmlFor={id}>{label}</Label>}
			{children}
			<FormMessage name={name} />
		</div>
	);
}

export function FormMessage({ name }: { name: string }) {
	const { errors } = useFormState({ name });
	const message = readErrorMessage(errors, name);
	if (!message) {
		return null;
	}
	return (
		<p role="alert" className="text-sm text-destructive" data-testid={`field-error-${name}`}>
			{message}
		</p>
	);
}

function readErrorMessage(errors: Record<string, unknown>, name: string): string | null {
	const node = errors[name] as { message?: unknown } | undefined;
	if (!node || typeof node !== "object") {
		return null;
	}
	return typeof node.message === "string" ? node.message : null;
}
