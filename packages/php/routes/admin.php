<?php

use Illuminate\Support\Facades\Route;
use Tbtop\Admin\Http\ActionController;
use Tbtop\Admin\Http\DataController;
use Tbtop\Admin\Http\FormSubmitController;
use Tbtop\Admin\Http\PageController;
use Tbtop\Admin\Http\TableController;
use Tbtop\Admin\Http\UploadController;
use Tbtop\Admin\Pages\Page;

/** @var list<class-string<Page>> $pages */
$pages = config('tbtop-admin.pages', []);

Route::middleware(config('tbtop-admin.middleware'))
    ->prefix(config('tbtop-admin.prefix'))
    ->group(function () use ($pages): void {
        Route::post('uploads/{tbtopProfile}', UploadController::class)->name('tbtop.upload');
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
        }
    });
