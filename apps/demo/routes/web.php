<?php

use App\Http\Controllers\Auth\TwoFactorController;
use App\Http\Middleware\RequireFullAuth;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/admin');

// JSON endpoints behind the DSL TwoFactorSetupPage's custom block.
Route::middleware([RequireFullAuth::class])->group(function () {
    Route::post('two-factor/setup', [TwoFactorController::class, 'setup'])
        ->name('two-factor.setup');

    Route::post('two-factor/confirm', [TwoFactorController::class, 'confirm'])
        ->name('two-factor.confirm');

    Route::post('two-factor/disable', [TwoFactorController::class, 'disable'])
        ->name('two-factor.disable');
});
