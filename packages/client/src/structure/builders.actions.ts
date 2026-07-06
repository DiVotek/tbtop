import type { ModalSize } from "../ui/modal-shell";
import type { ActionConfig, ClientActionContext, StructureNode } from "./types";

type ModalQuery = (ctx: ClientActionContext) => Promise<unknown>;

function assertActionConfig(cfg: ActionConfig): void {
	const hasHandler = typeof cfg.handler === "function";
	const hasUrl = cfg.url !== undefined;
	const hasModal = cfg.modal !== undefined;
	const count = Number(hasHandler) + Number(hasUrl) + Number(hasModal);
	if (count > 1) {
		throw new Error(
			`@tbtop/admin: action "${cfg.name}" must have exactly one of \`handler\`, \`url\`, or \`modal\``,
		);
	}
	if (count === 0) {
		throw new Error(
			`@tbtop/admin: action "${cfg.name}" must have one of \`handler\`, \`url\`, or \`modal\``,
		);
	}
}

interface ResolvedModal {
	title: string;
	description?: string;
	body?: StructureNode;
	size?: ModalSize;
	slideOver?: boolean;
	query?: ModalQuery;
}

type ModalBodyInput = StructureNode | ((s: unknown) => StructureNode) | undefined;

interface ModalInput {
	title: string;
	description?: string;
	body?: ModalBodyInput;
	size?: ModalSize;
	slideOver?: boolean;
	query?: ModalQuery;
}

function resolveModal(modal: ModalInput, sProxy: unknown): ResolvedModal {
	const resolved: ResolvedModal = { title: modal.title };
	if (modal.description !== undefined) {
		resolved.description = modal.description;
	}
	if (modal.body !== undefined) {
		resolved.body = typeof modal.body === "function" ? modal.body(sProxy) : modal.body;
	}
	if (modal.size !== undefined) {
		resolved.size = modal.size;
	}
	if (modal.slideOver !== undefined) {
		resolved.slideOver = modal.slideOver;
	}
	if (modal.query !== undefined) {
		resolved.query = modal.query;
	}
	return resolved;
}

export function makeBuildAction(sProxy: unknown) {
	return function buildAction(cfg: ActionConfig): StructureNode {
		assertActionConfig(cfg);
		const { name, modal, ...rest } = cfg as ActionConfig & {
			modal?: ModalInput;
		};
		const options: Record<string, unknown> = { ...rest };
		if (modal) {
			options.modal = resolveModal(modal, sProxy);
		}
		return { kind: "action", name, options, meta: {} };
	};
}

export function makeBuildActions(sProxy: unknown) {
	const buildAction = makeBuildAction(sProxy);
	return function buildActions(configs: ActionConfig[]): StructureNode {
		const children = configs.map((cfg) => buildAction(cfg));
		return { kind: "row", options: { children }, meta: {} };
	};
}
