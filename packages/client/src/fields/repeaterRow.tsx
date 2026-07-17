import { useTranslation } from "../i18n/i18n";
import { getBlockDescriptor } from "../render/blockRegistry";
import { renderDescriptor } from "../render/renderDescriptor";
import { useActiveLocale, useContentLocaleConfig } from "../structure/contentLocaleContext";
import { FieldError } from "../structure/formBlock";
import { useNearestFormController } from "../structure/formContext";
import { isNodeDisabled, isNodeHidden } from "../structure/meta";
import type { StructureNode } from "../structure/structure";
import type { ConditionContext } from "../structure/types";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { RepeaterSummaryRow } from "./repeaterSummaryRow";
import { renderTranslatableField } from "./translatableField";

type Item = Record<string, unknown>;

interface RepeaterRowProps {
	/** Dot-path to this repeater's own array field (e.g. "items", or "items.0.children" when nested). */
	repeaterName: string;
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
	const fieldErrors = ctrl?.fieldErrors ?? {};
	const { locales, defaultLocale } = useContentLocaleConfig();
	const activeLocaleCtx = useActiveLocale();
	const activeLocale = activeLocaleCtx?.active ?? defaultLocale;
	const { item, index, subFields, disabled, repeaterName } = props;
	const itemPath = `${repeaterName}.${index}`;

	const editor = subFields.map((node, sIdx) => {
		const condCtx = makeScopedCondCtx(item, rootData);
		return renderSubField({
			node,
			nodeKey: `${index}.${node.name ?? sIdx}`,
			scopedId: `${index}-${node.name ?? sIdx}`,
			itemPath,
			itemValue: item,
			condCtx,
			parentDisabled: disabled ?? false,
			locales,
			activeLocale,
			fieldErrors,
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
				title={summaryTitle(item, props.summaryField, { activeLocale, defaultLocale })}
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

/**
 * Resolves the collapsed row's title from the summary field's value. A
 * translatable subfield stores a locale map ({en, uk, ...}) rather than a
 * plain string — prefer the active content locale, fall back to the
 * default locale, then the first non-empty locale, so the row never shows
 * a blank title (or "[object Object]") just because the active tab has no
 * translation yet.
 */
function summaryTitle(
	item: Item,
	summaryField: string | undefined,
	locales: { activeLocale: string; defaultLocale: string },
): string {
	if (!summaryField) {
		return "";
	}
	const value = item[summaryField];
	if (typeof value === "string") {
		return value;
	}
	if (isLocaleMap(value)) {
		return (
			firstNonEmpty(value[locales.activeLocale]) ??
			firstNonEmpty(value[locales.defaultLocale]) ??
			firstNonEmptyValue(value) ??
			""
		);
	}
	return "";
}

function isLocaleMap(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstNonEmpty(value: unknown): string | undefined {
	return typeof value === "string" && value !== "" ? value : undefined;
}

function firstNonEmptyValue(map: Record<string, unknown>): string | undefined {
	for (const v of Object.values(map)) {
		const s = firstNonEmpty(v);
		if (s !== undefined) {
			return s;
		}
	}
	return undefined;
}

function makeScopedCondCtx(itemData: Item, rootData: Record<string, unknown>): ConditionContext {
	return { record: undefined, data: itemData, user: null, root: rootData };
}

interface RenderSubFieldInput {
	node: StructureNode;
	nodeKey: string;
	scopedId: string;
	/** Dot-path to this row's item (e.g. "items.0", or "items.0.children.2" when nested). */
	itemPath: string;
	itemValue: Item;
	condCtx: ConditionContext;
	parentDisabled: boolean;
	locales: string[];
	activeLocale: string;
	fieldErrors: Record<string, string>;
	onChange: (next: unknown) => void;
}

interface SubFieldErrorInput {
	fullPath: string;
	isTranslatable: boolean;
	activeLocale: string;
	fieldErrors: Record<string, string>;
}

/**
 * Resolves the inline error for a repeater sub-field. A plain sub-field's
 * server error lands at the full path (`items.0.label`); a translatable
 * sub-field's error lands per-locale (`items.0.label.en`) — no per-locale UI
 * exists inside a repeater row, so this shows the active locale's error,
 * falling back to any locale's error so a failure is never silently hidden.
 */
function subFieldError(input: SubFieldErrorInput): string | undefined {
	const { fullPath, isTranslatable, activeLocale, fieldErrors } = input;
	if (!isTranslatable) {
		return fieldErrors[fullPath];
	}
	const activeError = fieldErrors[`${fullPath}.${activeLocale}`];
	if (activeError) {
		return activeError;
	}
	const prefix = `${fullPath}.`;
	const anyLocaleKey = Object.keys(fieldErrors).find((key) => key.startsWith(prefix));
	return anyLocaleKey ? fieldErrors[anyLocaleKey] : undefined;
}

function renderSubField(input: RenderSubFieldInput) {
	const {
		node,
		nodeKey,
		scopedId,
		itemPath,
		itemValue,
		condCtx,
		parentDisabled,
		locales,
		activeLocale,
		fieldErrors,
		onChange,
	} = input;
	if (isNodeHidden(node.meta, condCtx)) {
		return null;
	}
	const fieldDisabled = parentDisabled || isNodeDisabled(node.meta, condCtx);
	const descriptor = getBlockDescriptor(node.kind);
	if (!descriptor || !node.name) {
		return null;
	}
	const subName = node.name;
	const fullPath = `${itemPath}.${subName}`;
	const baseOptions = (node.options as Record<string, unknown> | undefined) ?? {};
	// A nested repeater's OWN name must be the full ancestor path (not just its
	// bare name), so ITS sub-fields build correct error keys in turn — see this
	// function's own fullPath. defineFieldClient's formPropsFrom reads
	// options.name ahead of ctx.binding.name, so the override belongs here.
	// Harmless for every other kind, which never re-derives a name from options.
	const options = { name: node.kind === "repeater" ? fullPath : subName, ...baseOptions };
	const label = (options as { label?: string }).label;
	const required = (options as { required?: boolean }).required === true;
	const isTranslatable = (options as { translatable?: boolean }).translatable === true;
	const fieldError = subFieldError({ fullPath, isTranslatable, activeLocale, fieldErrors });
	const control = isTranslatable
		? renderTranslatableSubField({
				descriptor,
				node,
				options,
				subName,
				scopedId,
				value: itemValue[subName],
				fieldDisabled,
				locales,
				onChange,
			})
		: renderDescriptor(descriptor, {
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
		<div key={nodeKey} className="flex flex-col gap-1.5" data-field-name={fullPath}>
			{label && (
				<Label htmlFor={scopedId}>
					{label}
					{required && <span className="text-destructive">*</span>}
				</Label>
			)}
			{control}
			{fieldError && <FieldError name={fullPath} message={fieldError} />}
		</div>
	);
}

interface RenderTranslatableSubFieldInput {
	descriptor: NonNullable<ReturnType<typeof getBlockDescriptor>>;
	node: StructureNode;
	options: Record<string, unknown>;
	subName: string;
	scopedId: string;
	value: unknown;
	fieldDisabled: boolean;
	locales: string[];
	onChange: (next: unknown) => void;
}

/**
 * Wraps a repeater sub-field in TranslatableWrapper the same way
 * formBlock.renderFieldNode does for top-level fields — same shared helper,
 * so translatable behaves identically inside and outside repeaters.
 */
function renderTranslatableSubField(input: RenderTranslatableSubFieldInput) {
	const {
		descriptor,
		node,
		options,
		subName,
		scopedId,
		value,
		fieldDisabled,
		locales,
		onChange,
	} = input;
	// Strip name + translatable before forwarding — the wrapper derives
	// per-locale names itself and must not see the parent field name.
	const {
		name: _n,
		translatable: _translatable,
		...innerOptions
	} = options as Record<string, unknown> & { name?: string; translatable?: boolean };
	return renderTranslatableField({
		descriptor,
		node,
		innerOptions,
		name: subName,
		fieldId: scopedId,
		value,
		onChange,
		disabled: fieldDisabled,
		locales,
	});
}
