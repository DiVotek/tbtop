import { z } from "zod";

// Wire grammar contract: what the PHP DSL is allowed to emit.
// Source of truth for contracts/structure.schema.json (see generate.ts).
// Unknown kinds pass the base shape — custom blocks stay possible.

export const constraintsSchema = z
	.object({
		required: z.boolean().optional(),
		min: z.number().optional(),
		max: z.number().optional(),
		email: z.boolean().optional(),
		url: z.boolean().optional(),
		integer: z.boolean().optional(),
		regex: z.string().optional(),
		in: z.array(z.string()).optional(),
	})
	.strict();

export const effectSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("notify"),
		message: z.string(),
		level: z.enum(["info", "success", "error", "warning"]).optional(),
	}),
	z.object({ kind: z.literal("redirect"), href: z.string() }),
	z.object({ kind: z.literal("refreshTable"), table: z.string().optional() }),
	z.object({ kind: z.literal("resetForm"), form: z.string().optional() }),
	z.object({ kind: z.literal("closeModal") }),
]);

export const effectsSchema = z.array(effectSchema);

const nodeBase = z.object({
	kind: z.string(),
	name: z.string().optional(),
	options: z.record(z.string(), z.unknown()),
	meta: z.record(z.string(), z.unknown()),
});

export type WireNode = z.infer<typeof nodeBase> & { options: Record<string, unknown> };

const get = (node: WireNode, key: string): unknown => node.options[key];

export const actionSpecSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("visit"), href: z.string() }),
	z.object({ type: z.literal("submit"), form: z.string().optional() }),
	z.object({
		type: z.literal("server"),
		needs: z.array(z.enum(["form", "row", "selection"])),
	}),
	z.object({
		type: z.literal("modal"),
		title: z.string(),
		description: z.string().optional(),
		body: z.lazy((): z.ZodTypeAny => structureNodeSchema).optional(),
	}),
	z.object({
		type: z.literal("custom"),
		handler: z.string(),
		params: z.record(z.string(), z.unknown()),
	}),
]);

// Per-kind option requirements layered over the base shape.
const KIND_CHECKS: Record<string, (node: WireNode, ctx: z.RefinementCtx) => void> = {
	action: (node, ctx) => {
		const spec = actionSpecSchema.safeParse(get(node, "spec"));
		if (!spec.success) {
			ctx.addIssue({ code: "custom", message: `action spec invalid: ${spec.error.message}` });
		}
	},
	heading: (node, ctx) => {
		if (typeof get(node, "text") !== "string") {
			ctx.addIssue({ code: "custom", message: "heading needs options.text" });
		}
	},
	description: (node, ctx) => {
		if (typeof get(node, "text") !== "string") {
			ctx.addIssue({ code: "custom", message: "description needs options.text" });
		}
	},
	form: (node, ctx) => {
		if (!Array.isArray(get(node, "children"))) {
			ctx.addIssue({ code: "custom", message: "form needs options.children" });
		}
	},
	table: (node, ctx) => {
		const cols = get(node, "columns");
		const colShape = z.array(
			z.object({ name: z.string(), label: z.string().optional() }).loose(),
		);
		if (!colShape.safeParse(cols).success) {
			ctx.addIssue({ code: "custom", message: "table needs options.columns [{name}]" });
		}
	},
};

const CONTAINER_KEYS = ["children", "fields", "rowActions", "bulkActions"] as const;

export const structureNodeSchema: z.ZodTypeAny = nodeBase.superRefine((node, ctx) => {
	const check = KIND_CHECKS[node.kind];
	if (check) {
		check(node as WireNode, ctx);
	}
	const constraints = node.options.constraints;
	if (constraints !== undefined && !constraintsSchema.safeParse(constraints).success) {
		ctx.addIssue({ code: "custom", message: `invalid constraints on ${node.kind}` });
	}
	for (const key of CONTAINER_KEYS) {
		const value = node.options[key];
		if (value === undefined) {
			continue;
		}
		if (!Array.isArray(value)) {
			ctx.addIssue({ code: "custom", message: `options.${key} must be an array` });
			continue;
		}
		value.forEach((child, i) => {
			if (!structureNodeSchema.safeParse(child).success) {
				ctx.addIssue({
					code: "custom",
					message: `invalid child node at options.${key}[${i}]`,
				});
			}
		});
	}
});
