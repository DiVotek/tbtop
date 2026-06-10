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
export { ClientProvider, createAdminClient, useClient } from "./data/client";
export {
	collection,
	collectionPath,
	item,
	itemPath,
	single,
	uploadPath,
} from "./data/entityRoutes";
export type { Envelope, ErrorCode, TabletopError } from "./data/envelope";
export { decode, isTabletopError, unwrap } from "./data/envelope";
export type { UploadFileInput, UploadRow } from "./data/upload";
export { uploadFile } from "./data/upload";
export type { Row, RowsState } from "./data/useEntityRows";
export { useEntityRows } from "./data/useEntityRows";
export type { RecordState } from "./data/useRecord";
export { useRecord, useSingleRecord } from "./data/useRecord";
export type {
	I18nState,
	LocaleLoader,
	Messages,
	PluginMessages,
	Translate,
} from "./i18n/i18n";
export { defaultMessages, I18nProvider, useLocale, useTranslation } from "./i18n/i18n";
export { LanguageSwitcher } from "./i18n/LanguageSwitcher";
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
export { Input } from "./ui/input";
