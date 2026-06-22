import { useCallback, useEffect, useRef, useState } from "react";
import { renderNode } from "../render/structureRenderer";
import { Button } from "../ui/button";
import { ModalShell } from "../ui/modal-shell";
import { NodeIcon } from "../ui/node-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import {
	type ActionModalOpts,
	type ActionOptionsBag,
	actionKey,
	COLOR_TO_VARIANT,
} from "./actionBlock.shared";
import { useClientActionContext } from "./actionContext";
import { FormError, FormSkeleton } from "./defaults";
import { parseKeybinding, registerKeybinding } from "./keybinding";
import { ModalProvider, useNearestModal } from "./modalContext";
import { ModalDataProvider } from "./modalDataContext";
import { s } from "./structure";
import type { StructureNode } from "./types";
import { useAsyncQuery } from "./useAsyncQuery";

export function ModalActionBlock({
	options: opts,
	disabled = false,
}: {
	options: ActionOptionsBag;
	disabled?: boolean;
}) {
	const variant = opts.color ? COLOR_TO_VARIANT[opts.color] : "outline";
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const [open, setOpen] = useState(false);
	const parent = useNearestModal();
	const modal = opts.modal as ActionModalOpts;

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

	const close = useCallback(() => setOpen(false), []);
	const body = resolveBody(modal.body);

	const text = opts.label ?? opts.name;
	const iconEl = opts.icon ? <NodeIcon icon={opts.icon} className="size-4 shrink-0" /> : null;
	let label: React.ReactNode = text;
	if (iconEl && opts.icon?.position === "right") {
		label = (
			<>
				{text}
				{iconEl}
			</>
		);
	} else if (iconEl) {
		label = (
			<>
				{iconEl}
				{text}
			</>
		);
	}

	const trigger = (
		<Button
			type="button"
			ref={buttonRef}
			variant={variant}
			disabled={disabled}
			onClick={() => setOpen(true)}
			data-testid={`action-${actionKey(opts)}`}
		>
			{label}
		</Button>
	);

	return (
		<>
			{opts.tooltip ? (
				<Tooltip>
					<TooltipTrigger asChild>{trigger}</TooltipTrigger>
					<TooltipContent>{opts.tooltip}</TooltipContent>
				</Tooltip>
			) : (
				trigger
			)}
			<ModalShell
				open={open}
				onOpenChange={setOpen}
				title={modal.title}
				description={modal.description}
				size={modal.size}
				data-testid={`modal-${actionKey(opts)}`}
			>
				{body && open && (
					<ModalProvider close={close} parent={parent}>
						<ModalBody body={body} query={modal.query} />
					</ModalProvider>
				)}
			</ModalShell>
		</>
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
