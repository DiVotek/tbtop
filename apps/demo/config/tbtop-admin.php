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

return [
    // URL prefix all admin pages mount under.
    'prefix' => 'admin',

    // Middleware stack for pages, form submits and actions.
    'middleware' => ['web', 'auth'],

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
