<?php

return [
    'action' => [
        'save' => 'Save',
        'cancel' => 'Cancel',
        'delete' => 'Delete',
        'create' => 'Create',
        'edit' => 'Edit',
        'confirm' => 'Confirm',
        'logout' => 'Logout',
        'login' => 'Login',
        'register' => 'Register',
    ],
    'auth' => [
        'login' => [
            'title' => 'Sign in',
            'email' => 'Email',
            'password' => 'Password',
            'submit' => 'Sign in',
            'createAccount' => 'First time? Create an account',
            'success' => 'Welcome back',
            'failed' => 'Invalid email or password',
        ],
        'register' => [
            'title' => 'Create account',
            'submit' => 'Create account',
            'success' => 'Account created',
            'failed' => 'Could not create account',
        ],
        'profile' => [
            'title' => 'Profile',
        ],
    ],
    'validation' => [
        'required' => 'Required',
        'email' => 'Invalid email',
        'minLength' => 'Too short',
    ],
    'entity' => [
        'create' => ['success' => 'Created'],
        'update' => ['success' => 'Saved'],
        'delete' => ['success' => 'Deleted'],
        'save' => ['failed' => 'Could not save'],
        'delete_failed' => 'Could not delete',
    ],
    'state' => [
        'loading' => 'Loading…',
        'notFound' => 'Record not found',
        'forbidden' => 'You do not have access to this page',
        'empty' => 'No records yet',
        'error' => 'Something went wrong',
        'pageNotFound' => 'Page not found',
    ],
    'delete' => [
        'confirm' => [
            'title' => 'Delete record?',
            'body' => 'This action cannot be undone.',
        ],
    ],
    'form' => [
        'unsaved_guard' => [
            'title' => 'You have unsaved changes.',
            'body' => 'Are you sure you want to leave? Your changes will be lost.',
        ],
    ],
    'table' => [
        'search' => ['placeholder' => 'Search…'],
        'filters' => [
            'label' => 'Filters',
            'reset' => 'Reset',
        ],
        'columns' => ['label' => 'Columns'],
        'empty' => [
            'no_records' => 'No records',
            'no_results' => 'Nothing matches your search',
            'reset' => 'Reset filters',
        ],
        'pagination' => [
            'of' => 'of',
            'per_page' => 'Per page',
            'prev' => 'Previous',
            'next' => 'Next',
        ],
        'select_all' => 'Select all',
        'selected_count' => ':count selected',
    ],
    'nav' => [
        'home' => ['welcome' => 'Welcome'],
        'title' => 'Tabletop',
    ],
    'field' => [
        'password' => [
            'hide' => 'Hide password',
            'show' => 'Show password',
        ],
        'upload' => [
            'noData' => 'Upload returned no data',
            'uploading' => 'Uploading…',
            'prompt' => 'Click or drop a file',
        ],
        'tags' => ['placeholder' => 'Add tag…'],
        'search' => ['placeholder' => 'Search…'],
        'relation' => [
            'placeholder' => 'Related record id',
            'items' => ':count items',
        ],
        'select' => ['placeholder' => '—'],
        'slug' => [
            'clear' => 'Clear',
            'generate' => 'Generate',
        ],
        'keyvalue' => [
            'add_row' => 'Add row',
            'remove' => 'Remove row',
            'key' => 'Key',
            'value' => 'Value',
            'duplicate_key' => 'Duplicate key',
        ],
        'repeater' => [
            'add_item' => 'Add item',
            'remove' => 'Remove item',
            'item_label' => 'Item',
            'move_up' => 'Move up',
            'move_down' => 'Move down',
            'items' => ':count items',
            'item_singular' => '1 item',
        ],
        'richtext' => [
            'placeholder' => 'Start typing, or press / for commands…',
            'bold' => 'Bold',
            'italic' => 'Italic',
            'underline' => 'Underline',
            'strikethrough' => 'Strikethrough',
            'heading1' => 'Heading 1',
            'heading2' => 'Heading 2',
            'heading3' => 'Heading 3',
            'bullet_list' => 'Bullet list',
            'ordered_list' => 'Ordered list',
            'link' => 'Link',
            'code_block' => 'Code block',
            'quote' => 'Quote',
            'undo' => 'Undo',
            'redo' => 'Redo',
        ],
    ],
];
