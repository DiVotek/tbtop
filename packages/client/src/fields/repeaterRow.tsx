import { getBlockDescriptor } from "../render/blockRegistry";
import { renderDescriptor } from "../render/renderDescriptor";
import type { StructureNode } from "../structure/structure";
import { Button } from "../ui/button";

type Item = Record<string, unknown>;

interface RepeaterRowProps {
	item: Item;
	index: number;
	itemCount: number;
	subFields: StructureNode[];
	minItems: number;
	onSubFieldChange: (subName: string, next: unknown) => void;
	onRemove: () => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
}

export function RepeaterRow(props: RepeaterRowProps) {
	const { item, index, itemCount, subFields, minItems } = props;
	return (
		<div className="flex flex-col gap-2 rounded-md border p-3" data-repeater-item={index}>
			<div className="flex items-center justify-between">
				<span className="text-xs text-muted-foreground">{`Item ${index + 1}`}</span>
				<div className="flex gap-1">
					<Button
						type="button"
						variant="ghost"
						size="xs"
						aria-label="Move up"
						disabled={index === 0}
						onClick={props.onMoveUp}
					>
						↑
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						aria-label="Move down"
						disabled={index === itemCount - 1}
						onClick={props.onMoveDown}
					>
						↓
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						aria-label="Remove item"
						disabled={itemCount <= minItems}
						onClick={props.onRemove}
						className="text-destructive hover:text-destructive"
					>
						Remove
					</Button>
				</div>
			</div>
			{subFields.map((node, sIdx) =>
				renderSubField({
					node,
					nodeKey: `${index}.${node.name ?? sIdx}`,
					scopedId: `${index}-${node.name ?? sIdx}`,
					itemValue: item,
					onChange: (next) => props.onSubFieldChange(node.name ?? "", next),
				}),
			)}
		</div>
	);
}

interface RenderSubFieldInput {
	node: StructureNode;
	nodeKey: string;
	scopedId: string;
	itemValue: Item;
	onChange: (next: unknown) => void;
}

function renderSubField(input: RenderSubFieldInput) {
	const { node, nodeKey, scopedId, itemValue, onChange } = input;
	const descriptor = getBlockDescriptor(node.kind);
	if (!descriptor || !node.name) {
		return null;
	}
	const subName = node.name;
	const baseOptions = (node.options as Record<string, unknown> | undefined) ?? {};
	const options = { name: subName, ...baseOptions };
	const label = (options as { label?: string }).label;
	const required = (options as { required?: boolean }).required === true;
	const control = renderDescriptor(descriptor, {
		kind: node.kind,
		options,
		meta: { ...node.meta, id: scopedId },
		ctx: {
			surface: "form",
			binding: { name: subName, value: itemValue[subName] ?? null, onChange },
		},
		children: undefined,
		renderChild: () => null,
	});
	return (
		<div key={nodeKey} className="flex flex-col gap-1.5">
			{label && (
				<label className="text-sm font-medium" htmlFor={scopedId}>
					{label}
					{required && <span className="text-destructive">*</span>}
				</label>
			)}
			{control}
		</div>
	);
}
