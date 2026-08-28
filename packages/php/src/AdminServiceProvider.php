<?php

namespace Tbtop\Admin;

use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Foundation\Exceptions\Handler;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tbtop\Admin\Commands\InstallCommand;
use Tbtop\Admin\Commands\MakePageCommand;
use Tbtop\Admin\Http\PanelErrorPage;
use Tbtop\Admin\I18n\LocaleService;
use Tbtop\Admin\Navigation\NavBuilder;
use Tbtop\Admin\Panels\ChromeSerializer;
use Tbtop\Admin\Panels\CurrentPanel;
use Tbtop\Admin\Panels\PanelRegistry;

class AdminServiceProvider extends PackageServiceProvider
{
    public function configurePackage(Package $package): void
    {
        $package
            ->name('tbtop-admin')
            ->hasConfigFile()
            ->hasMigrations([
                '2026_01_01_000001_create_tbtop_media_folders_table',
                '2026_01_01_000002_create_tbtop_media_table',
                '2026_01_01_000003_add_metadata_to_tbtop_media_table',
                '2026_01_01_000004_add_dimensions_to_tbtop_media_table',
            ])
            ->runsMigrations()
            ->hasRoute('admin')
            ->hasTranslations()
            ->hasCommand(MakePageCommand::class)
            ->hasCommand(InstallCommand::class);
    }

    public function packageRegistered(): void
    {
        $this->app->singleton(PanelRegistry::class, static fn (): PanelRegistry => PanelRegistry::fromConfig());
    }

    public function packageBooted(): void
    {
        $this->registerPanelErrorRenderer();

        Inertia::share('tbtop', static function (): ?array {
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
        });
    }

    /**
     * A 404 raised while a panel is bound (a page's own findOrFail, an unknown
     * sub-route) renders the `admin/error` page inside that panel's chrome.
     * Laravel converts ModelNotFoundException to NotFoundHttpException before
     * consulting renderables, so one type covers both. Requests outside a
     * panel, and JSON clients (the table/select/upload endpoints), fall
     * through to the app's own handler untouched.
     */
    private function registerPanelErrorRenderer(): void
    {
        $this->callAfterResolving(ExceptionHandler::class, static function (ExceptionHandler $handler): void {
            if (! $handler instanceof Handler) {
                return;
            }
            $handler->renderable(static function (NotFoundHttpException $e, Request $request): ?Response {
                $panel = CurrentPanel::current();
                if ($panel === null || $request->expectsJson()) {
                    return null;
                }

                return PanelErrorPage::notFound($request, $panel);
            });
        });
    }
}
