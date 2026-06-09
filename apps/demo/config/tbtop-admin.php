<?php

use App\Admin\Pages\DashboardPage;
use App\Admin\Pages\PlaygroundPage;
use App\Admin\Pages\PostCreatePage;
use App\Admin\Pages\PostEditPage;
use App\Admin\Pages\PostsIndexPage;
use App\Admin\Pages\SettingsPage;

return [
    // URL prefix all admin pages mount under.
    'prefix' => 'admin',

    // Middleware stack for pages, form submits and actions.
    // TODO(shell phase): restore 'auth' once session login is wired.
    'middleware' => ['web'],

    // Registered page classes (list of class-strings extending Pages\Page).
    'pages' => [
        DashboardPage::class,
        PostsIndexPage::class,
        PostCreatePage::class,
        PostEditPage::class,
        SettingsPage::class,
        PlaygroundPage::class,
    ],
];
