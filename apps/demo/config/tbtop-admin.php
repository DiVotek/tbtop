<?php

use App\Admin\Pages\DashboardPage;
use App\Admin\Pages\MediaEditPage;
use App\Admin\Pages\MediaIndexPage;
use App\Admin\Pages\MediaNewPage;
use App\Admin\Pages\PlaygroundPage;
use App\Admin\Pages\PostCreatePage;
use App\Admin\Pages\PostEditPage;
use App\Admin\Pages\PostsIndexPage;
use App\Admin\Pages\SettingsPage;
use App\Http\Middleware\RequireFullAuth;
use App\Http\Middleware\SetAdminRootView;

return [
    // URL prefix all admin pages mount under.
    'prefix' => 'admin',

    // Middleware stack for pages, form submits and actions.
    'middleware' => ['web', RequireFullAuth::class, SetAdminRootView::class],

    // Registered page classes (list of class-strings extending Pages\Page).
    'pages' => [
        DashboardPage::class,
        PostsIndexPage::class,
        PostCreatePage::class,
        PostEditPage::class,
        MediaIndexPage::class,
        MediaNewPage::class,
        MediaEditPage::class,
        SettingsPage::class,
        PlaygroundPage::class,
    ],

    // Admin UI locales. First entry is the default.
    'locales' => ['en', 'uk'],

    // Fallback locale used when session has no preference.
    'default_locale' => 'en',

    // Content locales for translatable fields (separate from admin UI locales).
    'content_locales' => ['en', 'uk'],

    // Default content locale used for validation rules.
    'default_content_locale' => 'en',

    // Upload profiles consumed by POST /{prefix}/uploads/{profile}.
    'uploads' => [
        'media' => [
            'disk' => 'public',
            'dir' => 'uploads',
            'accept' => ['image/*'],
            'maxSize' => 5 * 1024 * 1024,
            'sizes' => ['thumb' => [128, 128]],
        ],
    ],
];
