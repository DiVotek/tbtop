<?php

// Threads the `required` field prop next to `describedBy` and spreads it as aria-required; idempotent.
// Run: php scripts/codemods/aria-required.php
// Allowlist on purpose: aria-required is invalid on role=button/group/slider/switch, so daterange, boolean,
// slider, colorpicker, repeater, upload, media, checkboxlist and togglebuttons stay out.

$dir = dirname(__DIR__, 2).'/packages/client/src/fields/';
$files = [
    'asyncOptionCombobox', 'checkboxField', 'dateField', 'jsonField', 'numberField', 'otpField', 'passwordField',
    'radioField', 'relationField', 'selectField', 'selectMulti', 'selectMultiShell', 'selectSingleShell',
    'slugField', 'tagsAsync', 'tagsClosed', 'tagsOpen', 'textField', 'textareaField', 'timeField',
];
$rules = [
    '/^(\s*)aria-describedby=\{describedBy\}$/m' => '$1aria-required={required || undefined}'."\n".'$0',
    '/^(\s*)aria-describedby=\{props\.describedBy\}$/m' => '$1aria-required={props.required || undefined}'."\n".'$0',
    '/^(\s*)describedBy=\{describedBy\}$/m' => '$0'."\n".'$1required={required}',
    '/^(\s*)describedBy=\{props\.describedBy\}$/m' => '$0'."\n".'$1required={props.required}',
    '/^(\s*)describedBy,$/m' => '$0'."\n".'$1required,',
    '/^(\s*)describedBy\?: string;$/m' => '$0'."\n".'$1required?: boolean;',
    '/\bdescribedBy, options \}/' => 'describedBy, required, options }',
];

foreach ($files as $file) {
    $path = "{$dir}{$file}.tsx";
    $source = (string) file_get_contents($path);
    if (str_contains($source, 'required') && preg_match('/\brequired[,?=}]|required \|\|/', $source)) {
        echo "{$file}: skipped, already threaded\n";

        continue;
    }
    file_put_contents($path, preg_replace(array_keys($rules), array_values($rules), $source));
    echo "{$file}: done\n";
}
