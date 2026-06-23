<?php

use App\Admin\AdminPanel;

return [
    // Registered panels. Prefix, guard, middleware, pages, UI locales and
    // root view live in each panel's configure() method.
    'panels' => [
        AdminPanel::class,
    ],

    // Content locales for translatable fields (separate from admin UI locales).
    'content_locales' => ['en', 'uk'],

    // Default content locale used for validation rules.
    'default_content_locale' => 'en',

    // Media manager (POST /admin/api/media/upload, import-url, etc.).
    'media' => [
        'disk' => 'public',
        'accept' => [
            'image/*',
            'application/pdf',
            'text/*',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/zip',
            'audio/*',
            'video/*',
        ],
        'max_size' => 10240,
        'profiles' => [
            'thumb' => [320, 320],
        ],
        'url_import' => [
            'timeout' => 30,
            'max_size' => 10240,
        ],
    ],
];
