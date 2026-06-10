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
];
