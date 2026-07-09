import { useCallback, useEffect, useRef, useState } from "react";
import { renderNode } from "../render/structureRenderer";
import { Alert, AlertDescription, type AlertVariant } from "../ui/alert";
import { Button } from "../ui/button";
import { ModalShell } from "../ui/modal-shell";
import {
	ActionLabel,
	type ActionModalOpts,
	type ActionOptionsBag,
	actionButtonSize,
	actionKey,
	actionVariant,
	MaybeTooltip,
	outlinedTintClass,
} from "./actionBlock.shared";
import { useClientActionContext } from "./actionContext";
import { FormError, FormSkeleton } from "./defaults";
import { parseKeybinding, registerKeybinding } from "./keybinding";
import { ModalProvider, useNearestModal } from "./modalContext";
import { ModalDataProvider } from "./modalDataContext";
import { s } from "./structure";
import { useNearestTriggerVariant } from "./triggerVariantContext";
import type { NotificationConfig, StructureNode } from "./types";
import { useAsyncQuery } from "./useAsyncQuery";

const HALT_VARIANT: Record<NonNullable<NotificationConfig["kind"]>, AlertVariant> = {
	info: "info",
	success: "success",
	warning: "warning",
	error: "danger",
};

export function ModalActionBlock({
	options: opts,
	disabled = false,
}: {
	options: ActionOptionsBag;
	disabled?: boolean;
}) {
	const plain = useNearestTriggerVariant() === "plain";
	const variant = plain ? "plain" : actionVariant(opts);
	const buttonSize = plain ? "full" : actionButtonSize(opts);
	const tint = plain ? undefined : outlinedTintClass(opts);
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const [open, setOpen] = useState(false);

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

	return (
		<>
			<MaybeTooltip tooltip={opts.tooltip} disabled={disabled}>
				<Button
					type="button"
					ref={buttonRef}
					variant={variant}
					size={buttonSize}
					className={tint}
					disabled={disabled}
					onClick={() => setOpen(true)}
					data-testid={`action-${actionKey(opts)}`}
				>
					<ActionLabel opts={opts} />
				</Button>
			</MaybeTooltip>
			<ActionModal opts={opts} open={open} onOpenChange={setOpen} />
		</>
	);
}

/**
 * The modal half of a modal action, controlled from outside — used by
 * ModalActionBlock's own trigger button and by rowClick (a row click opens
 * the modal of a rowActions entry that may itself be hidden).
 */
export function ActionModal({
	opts,
	open,
	onOpenChange,
}: {
	opts: ActionOptionsBag;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [halt, setHalt] = useState<{ message: string; level: NotificationConfig["kind"] } | null>(
		null,
	);
	const parent = useNearestModal();
	const modal = opts.modal as ActionModalOpts;

	// A fresh open starts with a clean halt banner.
	useEffect(() => {
		if (open) {
			setHalt(null);
		}
	}, [open]);

	const close = useCallback(() => onOpenChange(false), [onOpenChange]);
	const haltModal = useCallback(
		(message: string, level?: NotificationConfig["kind"]) => setHalt({ message, level }),
		[],
	);
	const body = resolveBody(modal.body);

	return (
		<ModalShell
			open={open}
			onOpenChange={onOpenChange}
			title={modal.title}
			description={modal.description}
			size={modal.size}
			slideOver={modal.slideOver}
			data-testid={`modal-${actionKey(opts)}`}
		>
			{halt && (
				<Alert
					variant={HALT_VARIANT[halt.level ?? "error"]}
					data-testid="modal-halt-message"
				>
					<AlertDescription>{halt.message}</AlertDescription>
				</Alert>
			)}
			{body && open && (
				<ModalProvider close={close} halt={haltModal} parent={parent}>
					<ModalBody body={body} query={modal.query} />
				</ModalProvider>
			)}
		</ModalShell>
	);
}

/**
 * Renders the modal body. When the modal declares a backend query, fetch it on
 * mount (the modal only mounts its body while open) and feed the result to the
 * body via ModalDataProvider. No query → renders the body directly.
 */
function ModalBody({ body, query }: { body: StructureNode; query?: ActionModalOpts["query"] }) {
	const ctx = useClientActionContext();
	const { state } = useAsyncQuery({ query, ctx });

	if (!query) {
		return <>{renderNode(body)}</>;
	}
	if (state.kind === "loading") {
		return <FormSkeleton />;
	}
	if (state.kind === "error") {
		return <FormError message={state.message} />;
	}
	return <ModalDataProvider value={state.data}>{renderNode(body)}</ModalDataProvider>;
}

function resolveBody(body: ActionModalOpts["body"]): StructureNode | undefined {
	if (!body) {
		return undefined;
	}
	if (typeof body === "function") {
		return body(s);
	}
	return body;
}
