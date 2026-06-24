<?php

namespace Tbtop\Admin\Http;

use Illuminate\Notifications\DatabaseNotification;

/**
 * Projects a stored Laravel DatabaseNotification into the wire shape the
 * header bell renders. The `data` column already holds the payload built by
 * the Notification DSL; this flattens it plus the read/created timestamps,
 * and never trusts a key's presence or type (records may predate the DSL).
 */
final class NotificationProjection
{
    /** @return array<string, mixed> */
    public static function item(DatabaseNotification $notification): array
    {
        $data = $notification->getAttribute('data');
        $data = is_array($data) ? $data : [];

        return [
            'id' => self::str($notification->getAttribute('id')),
            'title' => self::str($data['title'] ?? null),
            'body' => isset($data['body']) ? self::str($data['body']) : null,
            'icon' => isset($data['icon']) ? self::str($data['icon']) : null,
            'color' => isset($data['color']) ? self::str($data['color']) : null,
            'actions' => self::actions($data['actions'] ?? null),
            'readAt' => self::iso($notification->getAttribute('read_at')),
            'createdAt' => self::iso($notification->getAttribute('created_at')),
        ];
    }

    private static function str(mixed $value): string
    {
        return is_string($value) ? $value : (is_scalar($value) ? (string) $value : '');
    }

    private static function iso(mixed $value): ?string
    {
        return $value instanceof \DateTimeInterface ? $value->format(\DateTimeInterface::ATOM) : null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function actions(mixed $actions): array
    {
        if (! is_array($actions)) {
            return [];
        }

        $out = [];
        foreach ($actions as $action) {
            if (! is_array($action)) {
                continue;
            }
            $item = ['label' => self::str($action['label'] ?? null), 'url' => self::str($action['url'] ?? null)];
            if (($action['newTab'] ?? false) === true) {
                $item['newTab'] = true;
            }
            $out[] = $item;
        }

        return $out;
    }
}
