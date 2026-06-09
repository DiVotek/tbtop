<?php

return [
    // URL prefix all admin pages mount under.
    'prefix' => 'admin',

    // Middleware stack for pages, form submits and actions.
    'middleware' => ['web', 'auth'],

    // Registered page classes (list of class-strings extending Pages\Page).
    'pages' => [],
];
