import { useCallback, useEffect, useRef, useState } from "react";
import { renderNode } from "../render/structureRenderer";
import { Button } from "../ui/button";
import { ModalShell } from "../ui/modal-shell";
import {
	type ActionModalOpts,
	type ActionOptionsBag,
	actionKey,
	COLOR_TO_VARIANT,
} from "./actionBlock.shared";
import { parseKeybinding, registerKeybinding } from "./keybinding";
import { ModalProvider, useNearestModal } from "./modalContext";
import { s } from "./structure";
import type { StructureNode } from "./types";

export function ModalActionBlock({ options: opts }: { options: ActionOptionsBag }) {
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

	return (
		<>
			<Button
				type="button"
				ref={buttonRef}
				variant={variant}
				onClick={() => setOpen(true)}
				data-testid={`action-${actionKey(opts)}`}
			>
				{opts.label ?? opts.name}
			</Button>
			<ModalShell
				open={open}
				onOpenChange={setOpen}
				title={modal.title}
				description={modal.description}
				data-testid={`modal-${actionKey(opts)}`}
			>
				{body && (
					<ModalProvider close={close} parent={parent}>
						{renderNode(body)}
					</ModalProvider>
				)}
			</ModalShell>
		</>
	);
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
