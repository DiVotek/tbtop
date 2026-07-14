import { useTranslation } from "../i18n/i18n";
import { getBlockDescriptor } from "../render/blockRegistry";
import { renderDescriptor } from "../render/renderDescriptor";
import { useNearestFormController } from "../structure/formContext";
import { isNodeDisabled, isNodeHidden } from "../structure/meta";
import type { StructureNode } from "../structure/structure";
import type { ConditionContext } from "../structure/types";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { RepeaterSummaryRow } from "./repeaterSummaryRow";

type Item = Record<string, unknown>;

interface RepeaterRowProps {
	item: Item;
	index: number;
	itemCount: number;
	subFields: StructureNode[];
	minItems: number;
	disabled?: boolean;
	collapsible?: boolean;
	summaryField?: string;
	onSubFieldChange: (subName: string, next: unknown) => void;
	onRemove: () => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
}

export function RepeaterRow(props: RepeaterRowProps) {
	const ctrl = useNearestFormController();
	const rootData = ctrl?.data ?? {};
	const { item, index, subFields, disabled } = props;

	const editor = subFields.map((node, sIdx) => {
		const condCtx = makeScopedCondCtx(item, rootData);
		return renderSubField({
			node,
			nodeKey: `${index}.${node.name ?? sIdx}`,
			scopedId: `${index}-${node.name ?? sIdx}`,
			itemValue: item,
			condCtx,
			parentDisabled: disabled ?? false,
			onChange: (next) => props.onSubFieldChange(node.name ?? "", next),
		});
	});

	if (props.collapsible) {
		return (
			<RepeaterSummaryRow
				index={index}
				itemCount={props.itemCount}
				minItems={props.minItems}
				disabled={disabled}
				title={summaryTitle(item, props.summaryField)}
				editor={editor}
				onRemove={props.onRemove}
				onMoveUp={props.onMoveUp}
				onMoveDown={props.onMoveDown}
			/>
		);
	}

	return <ExpandedRow {...props}>{editor}</ExpandedRow>;
}

function ExpandedRow({
	index,
	itemCount,
	minItems,
	disabled,
	onRemove,
	onMoveUp,
	onMoveDown,
	children,
}: RepeaterRowProps & { children: React.ReactNode }) {
	const t = useTranslation();
	return (
		<div className="flex flex-col gap-2 rounded-md border p-3" data-repeater-item={index}>
			<div className="flex items-center justify-between">
				<span className="text-xs text-muted-foreground">{`${t("field.repeater.item_label")} ${index + 1}`}</span>
				<div className="flex gap-1">
					<Button
						type="button"
						variant="ghost"
						size="xs"
						aria-label={t("field.repeater.move_up")}
						disabled={disabled || index === 0}
						onClick={onMoveUp}
					>
						↑
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						aria-label={t("field.repeater.move_down")}
						disabled={disabled || index === itemCount - 1}
						onClick={onMoveDown}
					>
						↓
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						aria-label={t("field.repeater.remove")}
						disabled={disabled || itemCount <= minItems}
						onClick={onRemove}
						className="text-destructive hover:text-destructive"
					>
						{t("field.repeater.remove")}
					</Button>
				</div>
			</div>
			{children}
		</div>
	);
}

function summaryTitle(item: Item, summaryField?: string): string {
	if (!summaryField) {
		return "";
	}
	const value = item[summaryField];
	return typeof value === "string" ? value : "";
}

function makeScopedCondCtx(itemData: Item, rootData: Record<string, unknown>): ConditionContext {
	return { record: undefined, data: itemData, user: null, root: rootData };
}

interface RenderSubFieldInput {
	node: StructureNode;
	nodeKey: string;
	scopedId: string;
	itemValue: Item;
	condCtx: ConditionContext;
	parentDisabled: boolean;
	onChange: (next: unknown) => void;
}

function renderSubField(input: RenderSubFieldInput) {
	const { node, nodeKey, scopedId, itemValue, condCtx, parentDisabled, onChange } = input;
	if (isNodeHidden(node.meta, condCtx)) {
		return null;
	}
	const fieldDisabled = parentDisabled || isNodeDisabled(node.meta, condCtx);
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
			binding: {
				name: subName,
				value: itemValue[subName] ?? null,
				onChange,
				disabled: fieldDisabled,
			},
		},
		children: undefined,
		renderChild: () => null,
	});
	return (
		<div key={nodeKey} className="flex flex-col gap-1.5">
			{label && (
				<Label htmlFor={scopedId}>
					{label}
					{required && <span className="text-destructive">*</span>}
				</Label>
			)}
			{control}
		</div>
	);
}
