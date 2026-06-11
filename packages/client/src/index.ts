export { AdminLayout } from "./app/AdminLayout";
export { AuthUserProvider, useAuthUser } from "./app/authUser";
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
export type { UploadFileInput, UploadRow } from "./data/upload";
export { uploadFile } from "./data/upload";
export type {
	I18nState,
	LocaleLoader,
	Messages,
	PluginMessages,
	Translate,
} from "./i18n/i18n";
export { defaultMessages, I18nProvider, useLocale, useTranslation } from "./i18n/i18n";
// Inertia integration — server-authored pages
export { AdminPage } from "./inertia/AdminPage";
export { compileConstraints, type FieldConstraints } from "./inertia/constraints";
export { defineCustomAction } from "./inertia/customActions";
export { executeEffects, readEffects, type ServerEffect } from "./inertia/effects";
export { type MaterializeInput, materialize } from "./inertia/materialize";
export type { MediaFolder, MediaItem } from "./media/types";
export type {
	BlockBehavior,
	BlockDescriptor,
	FieldBinding,
	NodeMeta as BlockNodeMeta,
	RenderContext,
	RenderProps,
} from "./render/blockRegistry";
export { getBlockDescriptor, registerBlock } from "./render/blockRegistry";
export { defineBlock } from "./render/defineBlock";
export type { FieldClientDescriptor } from "./render/defineFieldClient";
export { defineFieldClient } from "./render/defineFieldClient";
export { ensureBuiltinsRegistered } from "./render/registerBuiltins";
export { renderNode } from "./render/structureRenderer";
export type {
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
export type {
	StructureBuilder,
	StructureBuilders,
	StructureNode,
} from "./structure/structure";
export { makeField, registerStructureBuilder, s } from "./structure/structure";
export { registerTableColor } from "./structure/table/colorRegistry";
export { registerTableIcon } from "./structure/table/iconRegistry";
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
} from "./structure/types";
export type { AlertProps, AlertVariant } from "./ui/alert";
export { Alert, AlertDescription, AlertTitle } from "./ui/alert";
export type { StatDescriptor } from "./ui/charts";
export { StatBlock, StatCard } from "./ui/charts";
export { Input } from "./ui/input";
export type { ConfirmDialogProps, ModalShellProps, ModalSize } from "./ui/modal-shell";
export { ConfirmDialog, ModalShell } from "./ui/modal-shell";
