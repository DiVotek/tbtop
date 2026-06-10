<?php

return [
    // URL prefix all admin pages mount under.
    'prefix' => 'admin',

    // Middleware stack for pages, form submits and actions.
    'middleware' => ['web', 'auth'],

    // Registered page classes (list of class-strings extending Pages\Page).
    'pages' => [],

    // Admin UI locales. First entry is the default.
    // Current locale is stored in the session under 'tbtop.locale'.
    'locales' => ['en'],

    // Fallback locale used when session has no preference.
    'default_locale' => 'en',

    // Content locales for translatable fields. First entry is the default.
    // Separate from admin UI locales — these are the locales for page content.
    'content_locales' => ['en'],

    // Default content locale used for field validation rules.
    'default_content_locale' => 'en',

    // Global default for the unsaved-changes navigation guard on forms.
    // Per-form override: FormBuilder::guardUnsaved(bool).
    'unsaved_guard' => true,

    // Whether to build and send the breadcrumbs prop.
    // Set to false to suppress breadcrumbs globally (prop is omitted from page response).
    'breadcrumbs' => true,

    // Media manager configuration.
    'media' => [
        // Storage disk for uploaded media files.
        'disk' => 'public',

        // Accepted MIME types (fnmatch patterns). Empty = allow all.
        'accept' => ['image/*'],

        // Maximum upload size in KB.
        'max_size' => 10240,

        // Conversion profiles: name => [maxWidth, maxHeight].
        // Files are scaled to fit inside the given box (aspect-ratio preserved).
        'profiles' => [
            'thumb' => [320, 320],
        ],

        // URL import settings.
        'url_import' => [
            'timeout' => 30,
            'max_size' => 10240,
        ],
    ],
];
