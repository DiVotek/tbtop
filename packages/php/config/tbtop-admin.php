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
];
