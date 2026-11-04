import { currentContext, defaultLocale } from "../dsl/context";
import {
	type AppearanceConfig,
	appearanceProp,
	assertAppearance,
	type NavigationLayout,
} from "./chrome/appearance";
import { assertBranding, type BrandingConfig, brandLogoProp } from "./chrome/branding";
import { type ChromeDef, serializeChrome } from "./chrome/chrome";
import {
	assertEnvironment,
	type EnvironmentIndicator,
	environmentProp,
} from "./chrome/environment";
import type { NavGroupDef } from "./chrome/navGroups";
import { allowedLinks, buildNav, linkItem, type NavLink } from "./chrome/navigation";
import { type PaletteConfig, paletteProp } from "./chrome/palette";
import type { PageDef } from "./page";

/** The shell knobs of a panel (PanelConfig.php): layout, nav, chrome, palette, appearance, branding. */
export interface PanelLook extends BrandingConfig {
	/** Default `sidebar`. All layouts collapse to a burger drawer on mobile. */
	navigation?: NavigationLayout;
	/** Meta and order of the sidebar groups that pages name in `nav.group`. */
	navigationGroups?: NavGroupDef[];
	/** Always-shown links merged into the sidebar (an external link). */
	navigationItems?: NavLink[];
	/** Profile-menu links beside the fixed theme/locale/logout controls. */
	userMenuItems?: NavLink[];
	/** The shell in the DSL; default: user menu on top, logo and nav on the side. */
	chrome?: ChromeDef;
	appearance?: AppearanceConfig;
	/** The ⌘K palette: on by default, false turns it off. */
	commandPalette?: boolean | PaletteConfig;
	/** Send the `breadcrumbs` page prop (default true). */
	breadcrumbs?: boolean;
	/** The app's environment name (`APP_ENV`, `NODE_ENV`), read by `environmentIndicator`. */
	environment?: string;
	/** A badge in the header naming the environment (local, staging); off by default. */
	environmentIndicator?: EnvironmentIndicator;
}

/** Fails at createAdmin() on a look the client cannot render. */
export function assertPanelLook(look: PanelLook): void {
	assertAppearance(look.navigation, look.appearance);
	assertEnvironment(look.environment, look.environmentIndicator);
	assertBranding(look);
}

export interface PanelInfo extends PanelLook {
	id: string;
	prefix: string;
	brand?: string;
	pages: PageDef[];
	/** UI locales the switcher offers. */
	locales: string[];
	/** Bell polling in seconds; null when the panel has no notifications store. */
	pollInterval: number | null;
}

/** The `tbtop` shared prop (PanelSharedProps.php): the panel's chrome, locale and signed-in user. */
export async function sharedProps(
	panel: PanelInfo,
	request: Request,
): Promise<Record<string, unknown>> {
	const context = currentContext();
	return {
		panel: panel.id,
		user: context.user ?? null,
		nav: await buildNav(panel, request),
		userMenuItems: (await allowedLinks(panel.userMenuItems ?? [], request)).map(linkItem),
		chrome: await serializeChrome(panel.chrome),
		brand: panel.brand ?? null,
		brandLogo: brandLogoProp(panel),
		favicon: panel.favicon ?? null,
		navigation: panel.navigation ?? "sidebar",
		appearance: appearanceProp(panel.appearance),
		environment: await environmentProp(request, panel.environment, panel.environmentIndicator),
		prefix: panel.prefix,
		apiBase: `${panel.prefix}/api`,
		locale: context.locale,
		locales: panel.locales,
		messages: context.messages,
		contentLocales: context.contentLocales,
		defaultContentLocale: defaultLocale(context),
		notifications: {
			pollInterval: panel.pollInterval === null ? null : panel.pollInterval * 1000,
		},
		palette: paletteProp(panel.commandPalette),
	};
}
