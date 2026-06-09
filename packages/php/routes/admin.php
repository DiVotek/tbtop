<?php

use Illuminate\Support\Facades\Route;
use Tbtop\Admin\Http\ActionController;
use Tbtop\Admin\Http\FormSubmitController;
use Tbtop\Admin\Http\PageController;
use Tbtop\Admin\Pages\Page;

/** @var list<class-string<Page>> $pages */
$pages = config('tbtop-admin.pages', []);

Route::middleware(config('tbtop-admin.middleware'))
    ->prefix(config('tbtop-admin.prefix'))
    ->group(function () use ($pages): void {
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
        }
    });
