<?php

use Illuminate\Support\Facades\Route;
use Tbtop\Admin\Http\ActionController;
use Tbtop\Admin\Http\DataController;
use Tbtop\Admin\Http\EditableColumnController;
use Tbtop\Admin\Http\FormSubmitController;
use Tbtop\Admin\Http\LocaleController;
use Tbtop\Admin\Http\Media\MediaController;
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
use Tbtop\Admin\Panels\PanelConfig;
use Tbtop\Admin\Panels\PanelRegistry;

$registerPageRoutes = static function (PanelConfig $panel): void {
    foreach ($panel->getPages() as $class) {
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

// One route group per panel: the panel's middleware + guard cover every
// endpoint inside, media/upload/locale included. Names: tbtop.{panel}.*
foreach (app(PanelRegistry::class)->all() as $panel) {
    Route::middleware([
        ...$panel->getMiddleware(),
        SetCurrentPanel::class.':'.$panel->getId(),
        'auth:'.$panel->getGuard(),
        SetAdminLocale::class,
    ])
        ->prefix($panel->getPrefix())
        ->name('tbtop.'.$panel->getId().'.')
        ->group(function () use ($panel, $registerPageRoutes): void {
            Route::post('locale', LocaleController::class)->name('locale');
            Route::post('uploads/{tbtopProfile}', UploadController::class)->name('upload');

            // Media manager endpoints (under api/ to avoid collision with page routes)
            Route::prefix('api/media')->name('media.')->group(function (): void {
                Route::get('/', [MediaController::class, 'index'])->name('index');
                Route::post('/upload', MediaUploadController::class)->name('upload');
                Route::post('/import-url', MediaImportController::class)->name('import-url');
                Route::get('/{id}', [MediaController::class, 'show'])->name('show')->whereNumber('id');
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

            $registerPageRoutes($panel);
        });
}
