<?php

return [
    'action' => [
        'save' => 'Зберегти',
        'cancel' => 'Скасувати',
        'delete' => 'Видалити',
        'create' => 'Створити',
        'edit' => 'Редагувати',
        'confirm' => 'Підтвердити',
        'logout' => 'Вийти',
        'login' => 'Увійти',
        'register' => 'Реєстрація',
    ],
    'auth' => [
        'login' => [
            'title' => 'Вхід',
            'email' => 'Електронна пошта',
            'password' => 'Пароль',
            'submit' => 'Увійти',
            'createAccount' => 'Вперше? Створіть акаунт',
            'success' => 'Ласкаво просимо',
            'failed' => 'Невірна електронна пошта або пароль',
        ],
        'register' => [
            'title' => 'Створити акаунт',
            'submit' => 'Створити акаунт',
            'success' => 'Акаунт створено',
            'failed' => 'Не вдалося створити акаунт',
        ],
        'profile' => [
            'title' => 'Профіль',
        ],
    ],
    'validation' => [
        'required' => 'Обов\'язкове поле',
        'email' => 'Невірна електронна пошта',
        'minLength' => 'Занадто коротко',
    ],
    'entity' => [
        'create' => ['success' => 'Створено'],
        'update' => ['success' => 'Збережено'],
        'delete' => ['success' => 'Видалено'],
        'save' => ['failed' => 'Не вдалося зберегти'],
        'delete_failed' => 'Не вдалося видалити',
    ],
    'state' => [
        'loading' => 'Завантаження…',
        'notFound' => 'Запис не знайдено',
        'forbidden' => 'У вас немає доступу до цієї сторінки',
        'empty' => 'Записів ще немає',
        'error' => 'Щось пішло не так',
        'pageNotFound' => 'Сторінку не знайдено',
    ],
    'delete' => [
        'confirm' => [
            'title' => 'Видалити запис?',
            'body' => 'Цю дію не можна скасувати.',
        ],
    ],
    'form' => [
        'unsaved_guard' => [
            'title' => 'У вас є незбережені зміни.',
            'body' => 'Ви впевнені, що хочете покинути сторінку? Зміни буде втрачено.',
        ],
    ],
    'table' => [
        'search' => ['placeholder' => 'Пошук…'],
        'filters' => [
            'label' => 'Фільтри',
            'reset' => 'Скинути',
        ],
        'columns' => ['label' => 'Колонки'],
        'empty' => [
            'no_records' => 'Записів немає',
            'no_results' => 'Нічого не знайдено',
            'reset' => 'Скинути фільтри',
        ],
        'pagination' => [
            'of' => 'з',
            'per_page' => 'На сторінці',
            'prev' => 'Назад',
            'next' => 'Вперед',
        ],
        'select_all' => 'Вибрати всі',
        'selected_count' => '{count} вибрано',
    ],
    'nav' => [
        'home' => ['welcome' => 'Ласкаво просимо'],
        'title' => 'Tabletop',
        'language' => 'Мова',
    ],
    'media' => [
        'upload_success' => 'Файл завантажено',
        'import_success' => 'Файл імпортовано',
        'update_success' => 'Оновлено',
        'delete_success' => 'Видалено',
        'delete_confirm' => [
            'title' => 'Видалити файл?',
            'body' => 'Файл та всі його конверсії буде безповоротно видалено.',
        ],
        'folder_delete_confirm' => [
            'title' => 'Видалити папку?',
            'body' => 'Папка має бути порожньою перед видаленням.',
        ],
        'errors' => [
            'blocked_url' => 'URL не дозволено (заблоковано з міркувань безпеки).',
            'download_failed' => 'Не вдалося завантажити файл за вказаним URL.',
            'file_too_large' => 'Файл перевищує максимально дозволений розмір.',
            'mime_not_allowed' => 'Цей тип файлу не дозволено.',
            'folder_not_empty' => 'Папка не порожня.',
        ],
    ],
    'field' => [
        'password' => [
            'hide' => 'Сховати пароль',
            'show' => 'Показати пароль',
        ],
        'upload' => [
            'noData' => 'Завантаження не повернуло даних',
            'uploading' => 'Завантаження…',
            'prompt' => 'Натисніть або перетягніть файл',
        ],
        'tags' => ['placeholder' => 'Додати тег…'],
        'search' => ['placeholder' => 'Пошук…'],
        'relation' => [
            'placeholder' => 'ID пов\'язаного запису',
            'items' => '{count} елементів',
        ],
        'select' => ['placeholder' => '—'],
        'slug' => [
            'clear' => 'Очистити',
            'generate' => 'Згенерувати',
        ],
        'keyvalue' => [
            'add_row' => 'Додати рядок',
            'remove' => 'Видалити рядок',
            'key' => 'Ключ',
            'value' => 'Значення',
            'duplicate_key' => 'Дублікат ключа',
        ],
        'repeater' => [
            'add_item' => 'Додати елемент',
            'remove' => 'Видалити елемент',
            'item_label' => 'Елемент',
            'move_up' => 'Вгору',
            'move_down' => 'Вниз',
            'items' => '{count} елементів',
            'item_singular' => '1 елемент',
        ],
        'richtext' => [
            'placeholder' => 'Почніть друкувати або натисніть / для команд…',
            'bold' => 'Жирний',
            'italic' => 'Курсив',
            'underline' => 'Підкреслення',
            'strikethrough' => 'Закреслення',
            'heading1' => 'Заголовок 1',
            'heading2' => 'Заголовок 2',
            'heading3' => 'Заголовок 3',
            'bullet_list' => 'Маркований список',
            'ordered_list' => 'Нумерований список',
            'link' => 'Посилання',
            'code_block' => 'Блок коду',
            'quote' => 'Цитата',
            'undo' => 'Скасувати',
            'redo' => 'Повторити',
        ],
    ],
];
