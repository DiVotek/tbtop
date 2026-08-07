<?php

use Tbtop\Admin\Dsl\RelationSearchLimit;
use Tbtop\Admin\Media\MediaUploadLimit;

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

    // Relation field configuration.
    'relation' => [
        // Rows returned by the relation-search endpoint. Fields override this
        // with ->searchLimit(); non-positive values fall back to the default.
        'search_cap' => RelationSearchLimit::DEFAULT_RESULTS,
    ],

    // Media manager configuration. Global on purpose: media storage is
    // shared across panels (per-panel media scoping is tenancy — out of scope).
    'media' => [
        // Storage disk for uploaded media files.
        'disk' => 'public',

        // Accepted MIME types (fnmatch patterns). Empty = allow all.
        // Note: image/* matches svg+xml. Stored SVG can carry scripts, so
        // uploads are sanitized server-side via Media\SvgSanitizer, keyed off
        // the file content/extension (not the spoofable mime). text/html is
        // refused regardless of this list — it is the SVG-as-html XSS vector.
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

        // Maximum media size in Laravel validation kilobytes (10 MiB by default).
        // Form Upload fields have a separate, per-field limit expressed in bytes.
        'max_size' => MediaUploadLimit::DEFAULT_KILOBYTES,

        // Conversion profiles: name => [maxWidth, maxHeight].
        // Files are scaled to fit inside the given box (aspect-ratio preserved).
        'profiles' => [
            'thumb' => [320, 320],
        ],

        // URL import settings. Empty allowed_hosts accepts any non-blocked host;
        // fnmatch patterns ('*.example.com') restrict imports to known sources.
        'url_import' => [
            'timeout' => 30,
            'allowed_hosts' => [],
        ],
    ],
];
