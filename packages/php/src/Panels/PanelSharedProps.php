<?php

namespace Tbtop\Admin\Panels;

use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Support\Facades\Auth;
use Tbtop\Admin\I18n\LocaleService;
use Tbtop\Admin\Navigation\NavBuilder;

/** The `tbtop` shared Inertia prop: the active panel's chrome, locale and signed-in user. */
final class PanelSharedProps
{
    /** @return array<string, mixed>|null */
    public static function current(): ?array
    {
        $panel = CurrentPanel::current();
        if ($panel === null) {
            return null;
        }

        $locale = LocaleService::currentLocale();
        $prefix = $panel->pathPrefix();
        $pollSeconds = $panel->notificationsPolling();
        $palette = $panel->commandPalette();

        return [
            'panel' => $panel->id(),
            'user' => self::user($panel),
            'nav' => NavBuilder::build($panel),
            'userMenuItems' => $panel->userMenuItems(),
            'chrome' => ChromeSerializer::forPanel($panel),
            'brand' => $panel->brand(),
            'navigation' => $panel->navigation(),
            'appearance' => $panel->appearance() ?: null,
            'prefix' => $prefix,
            'apiBase' => $prefix.'/api',
            'locale' => $locale,
            'locales' => LocaleService::availableLocales(),
            'messages' => LocaleService::messagesFor($locale),
            'contentLocales' => LocaleService::contentLocales(),
            'defaultContentLocale' => LocaleService::defaultContentLocale(),
            'notifications' => [
                'pollInterval' => $pollSeconds !== null ? $pollSeconds * 1000 : null,
            ],
            'palette' => $palette === null ? null : (object) $palette,
        ];
    }

    /**
     * The model's own serialization, so its `$hidden` decides what reaches the page HTML.
     *
     * @return array<string, mixed>|null
     */
    private static function user(CurrentPanel $panel): ?array
    {
        $user = Auth::guard($panel->guard())->user();

        return $user instanceof Arrayable ? $user->toArray() : null;
    }
}
