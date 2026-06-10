import { Link } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import {
	type ActionOptionsBag,
	type ActionRenderProps,
	actionKey,
	COLOR_TO_VARIANT,
} from "./actionBlock.shared";
import { useClientActionContext } from "./actionContext";
import { useNearestFormController } from "./formContext";
import { parseKeybinding, registerKeybinding } from "./keybinding";
import { ModalActionBlock } from "./modalActionBlock";
import type { ClientActionContext } from "./types";

type ActionOptions = ActionOptionsBag;

export function ActionBlock(props: ActionRenderProps) {
	const opts = props.options;
	if (opts.modal) {
		return <ModalActionBlock options={opts} />;
	}
	return <PlainActionBlock options={opts} />;
}

function PlainActionBlock({ options: opts }: { options: ActionOptionsBag }) {
	const ctx = useClientActionContext();
	const formHandle = useNearestFormController();
	const [pending, setPending] = useState(false);
	const variant = opts.color ? COLOR_TO_VARIANT[opts.color] : "outline";
	const buttonRef = useRef<HTMLButtonElement | null>(null);

	useEffect(() => {
		if (!opts.keybinding) {
			return;
		}
		const spec = parseKeybinding(opts.keybinding);
		if (!spec) {
			return;
		}
		return registerKeybinding(spec, () => buttonRef.current?.click());
	}, [opts.keybinding]);

	if (opts.url !== undefined && opts.handler === undefined) {
		const href = typeof opts.url === "function" ? opts.url(ctx) : opts.url;
		return (
			<Button
				asChild
				ref={buttonRef}
				variant={variant}
				data-testid={`action-${actionKey(opts)}`}
			>
				<Link href={href}>{opts.label ?? opts.name}</Link>
			</Button>
		);
	}

	const onClick = async () => {
		if (!opts.handler) {
			return;
		}
		setPending(true);
		try {
			await runHandlerWithValidation({ handler: opts.handler, ctx, formHandle });
		} finally {
			setPending(false);
		}
	};

	return (
		<Button
			type="button"
			ref={buttonRef}
			variant={variant}
			disabled={pending}
			onClick={onClick}
			data-testid={`action-${actionKey(opts)}`}
		>
			{opts.label ?? opts.name}
		</Button>
	);
}

interface RunInput {
	handler: NonNullable<ActionOptions["handler"]>;
	ctx: ClientActionContext;
	formHandle: ReturnType<typeof useNearestFormController>;
}

async function runHandlerWithValidation(input: RunInput): Promise<void> {
	if (input.formHandle && !preFlightSchemaParse(input.formHandle)) {
		input.formHandle.notifyErrorsApplied();
		return;
	}
	try {
		await input.handler(input.ctx);
	} catch (err) {
		if (input.formHandle && tryApplyServerFieldErrors(err, input.formHandle)) {
			input.formHandle.notifyErrorsApplied();
			return;
		}
		reportActionError(err, input.ctx);
	}
}

function reportActionError(err: unknown, ctx: ClientActionContext): void {
	console.error("[action] handler error", err);
	ctx.notify({ kind: "error", message: extractMessage(err) });
}

function extractMessage(err: unknown): string {
	if (err instanceof Error && err.message) {
		return err.message;
	}
	if (typeof err === "string" && err.length > 0) {
		return err;
	}
	return "Action failed";
}

function preFlightSchemaParse(
	handle: NonNullable<ReturnType<typeof useNearestFormController>>,
): boolean {
	if (!handle.schema) {
		return true;
	}
	try {
		handle.schema.parse(handle.data);
		return true;
	} catch (err) {
		applyZodIssues(err, handle);
		return false;
	}
}

interface ZodLike {
	issues?: { path: (string | number)[]; message: string }[];
}

function applyZodIssues(
	err: unknown,
	handle: NonNullable<ReturnType<typeof useNearestFormController>>,
): void {
	const issues = (err as ZodLike).issues;
	if (!Array.isArray(issues)) {
		return;
	}
	for (const issue of issues) {
		const name = issue.path[0];
		if (typeof name === "string") {
			handle.setFieldError(name, issue.message);
		}
	}
}

function tryApplyServerFieldErrors(
	err: unknown,
	handle: NonNullable<ReturnType<typeof useNearestFormController>>,
): boolean {
	const fields = readFieldErrors(err);
	if (!fields) {
		return false;
	}
	for (const [name, message] of Object.entries(fields)) {
		handle.setFieldError(name, message);
	}
	return true;
}

function readFieldErrors(err: unknown): Record<string, string> | null {
	if (!err || typeof err !== "object") {
		return null;
	}
	const obj = err as { fields?: unknown; errors?: unknown };
	const flat = normalizeFieldEntries(obj.fields);
	if (flat) {
		return flat;
	}
	return normalizeFieldEntries(obj.errors);
}

function normalizeFieldEntries(raw: unknown): Record<string, string> | null {
	if (!raw || typeof raw !== "object") {
		return null;
	}
	const entries: Record<string, string> = {};
	for (const [name, value] of Object.entries(raw as Record<string, unknown>)) {
		if (typeof value === "string") {
			entries[name] = value;
		} else if (Array.isArray(value) && typeof value[0] === "string") {
			entries[name] = value[0];
		}
	}
	return Object.keys(entries).length === 0 ? null : entries;
}
