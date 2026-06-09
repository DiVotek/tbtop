<?php

use App\Admin\Pages\PlaygroundPage;

return [
    // URL prefix all admin pages mount under.
    'prefix' => 'admin',

    // Middleware stack for pages, form submits and actions.
    // TODO(shell phase): restore 'auth' once session login is wired.
    'middleware' => ['web'],

    // Registered page classes (list of class-strings extending Pages\Page).
    'pages' => [
        PlaygroundPage::class,
    ],
];
