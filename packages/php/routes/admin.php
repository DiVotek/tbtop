<?php

use Illuminate\Support\Facades\Route;
use Tbtop\Admin\Http\ActionController;
use Tbtop\Admin\Http\DataController;
use Tbtop\Admin\Http\EditableColumnController;
use Tbtop\Admin\Http\FormSubmitController;
use Tbtop\Admin\Http\LocaleController;
use Tbtop\Admin\Http\Media\MediaController;
use Tbtop\Admin\Http\Media\MediaDownloadController;
use Tbtop\Admin\Http\Media\MediaFolderController;
use Tbtop\Admin\Http\Media\MediaImportController;
use Tbtop\Admin\Http\Media\MediaReplaceController;
use Tbtop\Admin\Http\Media\MediaUploadController;
use Tbtop\Admin\Http\PageController;
use Tbtop\Admin\Http\RelationSearchController;
use Tbtop\Admin\Http\SelectCreateController;
use Tbtop\Admin\Http\SetAdminLocale;
use Tbtop\Admin\Http\SetCurrentPanel;
use Tbtop\Admin\Http\TableController;
use Tbtop\Admin\Http\UploadController;
use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Panels\PanelRegistry;

/**
 * Register the full endpoint cluster for each page in the given subset. The
 * page and its actions/forms/tables/data/etc. all sit in one route group, so
 * they share that page's resolved middleware stack.
 *
 * @param  list<class-string<Page>>  $pages
 */
$registerPageRoutes = static function (array $pages): void {
    foreach ($pages as $class) {
        $path = trim($class::path(), '/');
        Route::get($path, [PageController::class, 'show'])
            ->defaults('tbtopPage', $class)
            ->name($class::slug());
        Route::post("{$path}/forms/{tbtopForm}", FormSubmitController::class)
            ->defaults('tbtopPage', $class)
            ->name($class::slug().'.form');
        Route::post("{$path}/actions/{tbtopAction}", ActionController::class)
            ->defaults('tbtopPage', $class)
            ->name($class::slug().'.action');
        Route::get("{$path}/tables/{tbtopTable}", TableController::class)
            ->defaults('tbtopPage', $class)
            ->name($class::slug().'.table');
        Route::get("{$path}/data/{tbtopData}", DataController::class)
            ->defaults('tbtopPage', $class)
            ->name($class::slug().'.data');
        Route::post("{$path}/select-create/{tbtopField}", SelectCreateController::class)
            ->defaults('tbtopPage', $class)
            ->name($class::slug().'.selectCreate');
        Route::post("{$path}/relation-search/{tbtopField}", RelationSearchController::class)
            ->defaults('tbtopPage', $class)
            ->name($class::slug().'.relationSearch');
        Route::post("{$path}/cells/{tbtopTable}/{tbtopColumn}", EditableColumnController::class)
            ->defaults('tbtopPage', $class)
            ->name($class::slug().'.cell');
    }
};

/**
 * The locale, upload, and media-manager cluster. Lives only in the panel's
 * default (inherited) group — a public page must not expose these unauthenticated.
 */
$registerChromeRoutes = static function (): void {
    Route::post('locale', LocaleController::class)->name('locale');
    Route::post('uploads/{tbtopProfile}', UploadController::class)->name('upload');

    // Media manager endpoints (under api/ to avoid collision with page routes)
    Route::prefix('api/media')->name('media.')->group(function (): void {
        Route::get('/', [MediaController::class, 'index'])->name('index');
        Route::post('/upload', MediaUploadController::class)->name('upload');
        Route::post('/import-url', MediaImportController::class)->name('import-url');
        Route::get('/{id}', [MediaController::class, 'show'])->name('show')->whereNumber('id');
        Route::get('/{id}/download', MediaDownloadController::class)->name('download')->whereNumber('id');
        Route::patch('/{id}', [MediaController::class, 'update'])->name('update')->whereNumber('id');
        Route::post('/{id}/replace', MediaReplaceController::class)->name('replace')->whereNumber('id');
        Route::delete('/{id}', [MediaController::class, 'destroy'])->name('destroy')->whereNumber('id');

        Route::prefix('folders')->name('folders.')->group(function (): void {
            Route::get('/', [MediaFolderController::class, 'index'])->name('index');
            Route::post('/', [MediaFolderController::class, 'store'])->name('store');
            Route::patch('/{id}', [MediaFolderController::class, 'update'])->name('update')->whereNumber('id');
            Route::delete('/{id}', [MediaFolderController::class, 'destroy'])->name('destroy')->whereNumber('id');
        });
    });
};

// One route group per distinct resolved middleware stack within a panel. Pages
// that inherit (Page::middleware() === null) collapse into the panel's default
// group, which also carries the chrome cluster; each distinct override gets its
// own group. SetCurrentPanel + SetAdminLocale are always applied. Names stay
// tbtop.{panel}.* across all groups — slugs are unique, so they never collide.
foreach (app(PanelRegistry::class)->all() as $panel) {
    $defaultStack = $panel->authStack();
    $defaultKey = implode('|', $defaultStack);

    /** @var array<string, array{stack: list<string>, pages: list<class-string<Page>>}> $buckets */
    $buckets = [];
    foreach ($panel->getPages() as $class) {
        $stack = $class::middleware($panel) ?? $defaultStack;
        $key = implode('|', $stack);
        $buckets[$key] ??= ['stack' => $stack, 'pages' => []];
        $buckets[$key]['pages'][] = $class;
    }

    // Ensure the default group exists even when every page overrides — it hosts
    // the chrome cluster.
    $buckets[$defaultKey] ??= ['stack' => $defaultStack, 'pages' => []];

    foreach ($buckets as $key => $bucket) {
        $isDefault = $key === $defaultKey;

        Route::middleware([
            SetCurrentPanel::class.':'.$panel->getId(),
            ...$bucket['stack'],
            SetAdminLocale::class,
        ])
            ->prefix($panel->getPrefix())
            ->name('tbtop.'.$panel->getId().'.')
            ->group(function () use ($bucket, $isDefault, $registerPageRoutes, $registerChromeRoutes): void {
                if ($isDefault) {
                    $registerChromeRoutes();
                }

                $registerPageRoutes($bucket['pages']);
            });
    }
}
