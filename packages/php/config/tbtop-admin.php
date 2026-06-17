<?php

return [
    // Registered panels (list of class-strings extending Panels\Panel).
    // Per-panel settings (prefix, guard, middleware, pages, UI locales,
    // unsaved guard, breadcrumbs, brand, root view, chrome) live in each
    // panel's configure() method.
    'panels' => [],

    // Content locales for translatable fields. First entry is the default.
    // Global on purpose: content locales describe the data, not a panel.
    'content_locales' => ['en'],

    // Default content locale used for field validation rules.
    'default_content_locale' => 'en',

    // Media manager configuration. Global on purpose: media storage is
    // shared across panels (per-panel media scoping is tenancy — out of scope).
    'media' => [
        // Storage disk for uploaded media files.
        'disk' => 'public',

        // Accepted MIME types (fnmatch patterns). Empty = allow all.
        // Note: image/* matches svg+xml. Stored SVG can carry scripts, so
        // uploads are sanitized server-side via Media\SvgSanitizer (the XSS
        // vector is stripped on write — SVG stays allowed and renders inline).
        'accept' => [
            'image/*',
            'application/pdf',
            'text/*', // md, csv, txt
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/zip',
            'audio/*',
            'video/*',
        ],

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
