<?php

use Illuminate\Support\Facades\Route;
use Tbtop\Admin\Http\ActionController;
use Tbtop\Admin\Http\DataController;
use Tbtop\Admin\Http\FormSubmitController;
use Tbtop\Admin\Http\LocaleController;
use Tbtop\Admin\Http\Media\MediaController;
use Tbtop\Admin\Http\Media\MediaFolderController;
use Tbtop\Admin\Http\Media\MediaImportController;
use Tbtop\Admin\Http\Media\MediaReplaceController;
use Tbtop\Admin\Http\Media\MediaUploadController;
use Tbtop\Admin\Http\PageController;
use Tbtop\Admin\Http\SelectCreateController;
use Tbtop\Admin\Http\SetAdminLocale;
use Tbtop\Admin\Http\TableController;
use Tbtop\Admin\Http\UploadController;
use Tbtop\Admin\Pages\Page;

/** @var list<class-string<Page>> $pages */
$pages = config('tbtop-admin.pages', []);

Route::middleware([...(array) config('tbtop-admin.middleware'), SetAdminLocale::class])
    ->prefix(config('tbtop-admin.prefix'))
    ->group(function () use ($pages): void {
        Route::post('locale', LocaleController::class)->name('tbtop.locale');
        Route::post('uploads/{tbtopProfile}', UploadController::class)->name('tbtop.upload');

        // Media manager endpoints (under api/ to avoid collision with page routes)
        Route::prefix('api/media')->name('tbtop.media.')->group(function (): void {
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
        foreach ($pages as $class) {
            $path = trim($class::path(), '/');
            Route::get($path, [PageController::class, 'show'])
                ->defaults('tbtopPage', $class)
                ->name('tbtop.'.$class::slug());
            Route::post("{$path}/forms/{tbtopForm}", FormSubmitController::class)
                ->defaults('tbtopPage', $class)
                ->name('tbtop.'.$class::slug().'.form');
            Route::post("{$path}/actions/{tbtopAction}", ActionController::class)
                ->defaults('tbtopPage', $class)
                ->name('tbtop.'.$class::slug().'.action');
            Route::get("{$path}/tables/{tbtopTable}", TableController::class)
                ->defaults('tbtopPage', $class)
                ->name('tbtop.'.$class::slug().'.table');
            Route::get("{$path}/data/{tbtopData}", DataController::class)
                ->defaults('tbtopPage', $class)
                ->name('tbtop.'.$class::slug().'.data');
            Route::post("{$path}/select-create/{tbtopField}", SelectCreateController::class)
                ->defaults('tbtopPage', $class)
                ->name('tbtop.'.$class::slug().'.selectCreate');
        }
    });
