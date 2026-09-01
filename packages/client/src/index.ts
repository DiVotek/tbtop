export { AdminLayout } from "./app/AdminLayout";
export { AuthUserProvider, useAuthUser } from "./app/authUser";
export { definePaletteCommand } from "./app/commandPalette/handlers";
export type { CommandPaletteData, PaletteCommand } from "./app/commandPalette/types";
export { type NavigateFn, useNavigate } from "./app/navigate";
export {
	type PageParams,
	PageParamsContext,
	PageParamsProvider,
	useParams,
} from "./app/pageParams";
export type {
	AdminClient,
	ClientProviderProps,
	CreateAdminClientOptions,
	QueryParams,
	QueryValue,
	UploadOptions,
} from "./data/client";
export { ClientProvider, useClient } from "./data/client";
export { collection, item, single } from "./data/entityRoutes";
export type { Envelope, TabletopError } from "./data/envelope";
export { isTabletopError } from "./data/envelope";
export type { UploadRow } from "./data/upload";
export type { FieldCellProps, FieldFormProps } from "./fields/fieldProps";
// Richtext is exported only through its lazy wrappers: Lexical is a ~270KB chunk
// kept out of the static graph, and a direct re-export would pull it into every
// consumer's main bundle. The wrappers already carry lazy() + Suspense.
export type { RichtextFormLazyProps } from "./fields/richtext/richtextFormLazy";
export { RichtextFormLazy } from "./fields/richtext/richtextFormLazy";
export type { RichtextViewLazyProps } from "./fields/richtext/richtextViewLazy";
export { RichtextViewLazy } from "./fields/richtext/richtextViewLazy";
export type {
	I18nState,
	LocaleLoader,
	Messages,
	PluginMessages,
	Translate,
} from "./i18n/i18n";
export { defaultMessages, I18nProvider, useLocale, useTranslation } from "./i18n/i18n";
// Inertia integration — server-authored pages
export { AdminErrorPage } from "./inertia/AdminErrorPage";
export { AdminPage } from "./inertia/AdminPage";
export { compileConstraints, type FieldConstraints } from "./inertia/constraints";
export { defineCustomAction } from "./inertia/customActions";
export { executeEffects, readEffects, type ServerEffect } from "./inertia/effects";
export { type MaterializeInput, materialize } from "./inertia/materialize";
export type { FilePreviewPredicate, FilePreviewRenderer } from "./media/filePreview";
export { FilePreview, registerFilePreview } from "./media/filePreview";
export type { MediaFolder, MediaItem } from "./media/types";
export type {
	BlockBehavior,
	BlockDescriptor,
	BlockMaterializer,
	FieldBinding,
	NodeMeta as BlockNodeMeta,
	RenderContext,
	RenderProps,
} from "./render/blockRegistry";
export { clearBlockRegistry, getBlockDescriptor, registerBlock } from "./render/blockRegistry";
export { defineBlock } from "./render/defineBlock";
export type { FieldClientDescriptor } from "./render/defineFieldClient";
export { defineFieldClient } from "./render/defineFieldClient";
export { ensureBuiltinsRegistered } from "./render/registerBuiltins";
export { renderNode } from "./render/structureRenderer";
export type {
	ChartBlockInput,
	ChartBlockOptions,
	ChartPoint,
	ChartSeries,
	ChartType,
} from "./structure/chartBlock";
export { DisplayAlertBlock, displayAlertBlockDescriptor } from "./structure/displayAlertBlock";
export {
	DisplayDividerBlock,
	displayDividerBlockDescriptor,
} from "./structure/displayDividerBlock";
export { DisplayHtmlBlock, displayHtmlBlockDescriptor } from "./structure/displayHtmlBlock";
export { DisplayTextBlock, displayTextBlockDescriptor } from "./structure/displayTextBlock";
export { useNearestFormController } from "./structure/formContext";
export type {
	StructureBuilder,
	StructureBuilders,
	StructureNode,
	TimeOpts,
} from "./structure/structure";
export { makeField, registerStructureBuilder, s } from "./structure/structure";
export { registerTableColor } from "./structure/table/colorRegistry";
export { registerIcon, registerTableIcon } from "./structure/table/iconRegistry";
export type {
	ActionColor,
	ActionConfig,
	AuthUser,
	ClientActionContext,
	ConditionContext,
	ConditionFn,
	FormController,
	FormOptions,
	ListQueryParams,
	ModalConfig,
	ModalController,
	NodeId,
	NodeMeta,
	NotificationConfig,
	PaginatedResponse,
	TabItem,
	TableColumn,
	TableColumnBadgeOptions,
	TableColumnBooleanOptions,
	TableColumnIcon,
	TableColumnIconMapEntry,
	TableController,
	TableOptions,
	TablePaginationOptions,
	TableTab,
} from "./structure/types";
// Public UI surface. Principle: `ui/` holds presentational primitives and is
// public; `structure/` and `fields/` interpret StructureNode and stay internal.
// Access to a component is not the right to rewrite it — exposing composites
// costs nothing beyond ordinary semver.
// Stability: component props and variant names follow semver; the internal
// Tailwind class strings do not. The package's `styles.css` must be imported
// for these primitives to render correctly.
export type { AlertProps, AlertVariant } from "./ui/alert";
export { Alert, AlertDescription, AlertTitle } from "./ui/alert";
export { Badge, badgeVariants } from "./ui/badge";
export type { ButtonProps } from "./ui/button";
export { Button, buttonVariants } from "./ui/button";
export {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./ui/card";
// Calendar is deliberately NOT exported here, unlike the rest of ui/: a static
// re-export puts react-day-picker into the main entry's graph and undoes the
// lazy() split in daterangeField. Same reason richtext ships only as wrappers.
export type { StatDescriptor } from "./ui/charts";
export { StatBlock, StatCard } from "./ui/charts";
export { Checkbox } from "./ui/checkbox";
export { CopyButton } from "./ui/copyButton";
export {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
export { Input, inputCompactFontClass, inputFontClass, inputTextClass } from "./ui/input";
export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "./ui/inputOtp";
export { Label } from "./ui/label";
export type { ConfirmDialogProps, ModalShellProps, ModalSize } from "./ui/modal-shell";
export { ConfirmDialog, ModalShell } from "./ui/modal-shell";
export type { IconDef } from "./ui/node-icon";
export { NodeIcon } from "./ui/node-icon";
export {
	Popover,
	PopoverAnchor,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "./ui/popover";
export { Progress } from "./ui/progress";
export { RadioGroup, RadioGroupItem } from "./ui/radio-group";
export type { ResponsiveDialogProps } from "./ui/revola";
export {
	ResponsiveDialog,
	ResponsiveDialogClose,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
	ResponsiveDialogTrigger,
} from "./ui/revola";
export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
export { Slider } from "./ui/slider";
export { ReloadOverlay, Spinner } from "./ui/spinner";
export { Switch } from "./ui/switch";
export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants } from "./ui/tabs";
export { Textarea } from "./ui/textarea";
export { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
