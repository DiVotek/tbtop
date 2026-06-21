<?php

namespace App\Admin\Pages;

use Tbtop\Admin\Dsl\Color;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Read-only record detail view built from the display primitives (M-96).
 *
 * The author holds the record and passes each value to a display block
 * directly — there is no binding/infolist layer. This replaces the old
 * "infolist" gap with a compose-from-primitives approach.
 */
class RecordDetailPage extends Page
{
    public static function path(): string
    {
        return 'record-detail';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Content', 'label' => 'Record detail', 'order' => 9];
    }

    public function title(): string
    {
        return 'Record detail';
    }

    public function view(S $s): Node
    {
        $record = $this->record();

        return $s->stack([
            $s->displayText('Order #1042')->variant('heading'),
            $s->displayText('A read-only detail view composed from display primitives.')->variant('muted'),
            $s->section(['title' => 'Summary'], [
                $s->displayValue($record['status'])->badge(['paid' => Color::Success, 'pending' => Color::Warning]),
                $s->displayValue($record['shipped'])->boolean(trueColor: Color::Success, falseColor: 'gray'),
                $s->displayValue($record['fulfillment'])->icon([
                    'shipped' => ['icon' => 'truck', 'color' => 'success'],
                    'packing' => ['icon' => 'package', 'color' => 'warning'],
                ]),
                $s->displayValue($record['total_cents'])->money('USD'),
                $s->displayValue($record['placed_at'])->date('Y-m-d'),
            ]),
            $s->section(['title' => 'Cover'], [
                $s->displayImage($record['cover_url'])->alt('Product cover')->caption('Primary product image'),
            ]),
            $s->section(['title' => 'Notes'], [
                $s->displayRichtext($record['notes']),
            ]),
            $s->section(['title' => 'Attributes'], [
                $s->displayKeyValue($record['attributes']),
            ]),
        ]);
    }

    /** @return array<string, mixed> */
    private function record(): array
    {
        return [
            'status' => 'paid',
            'shipped' => true,
            'fulfillment' => 'shipped',
            'total_cents' => 4999,
            'placed_at' => '2024-03-15 10:30:00',
            'cover_url' => '/logo.svg',
            'notes' => $this->notesState(),
            'attributes' => ['SKU' => 'TT-1042', 'Weight' => '1.2 kg', 'Color' => 'Walnut'],
        ];
    }

    /** @return array<string, mixed> A stored Lexical SerializedEditorState. */
    private function notesState(): array
    {
        return [
            'root' => [
                'children' => [
                    [
                        'children' => [
                            ['detail' => 0, 'format' => 0, 'mode' => 'normal', 'style' => '', 'text' => 'Handle with care — fragile finish.', 'type' => 'text', 'version' => 1],
                        ],
                        'direction' => 'ltr', 'format' => '', 'indent' => 0, 'type' => 'paragraph', 'version' => 1,
                    ],
                ],
                'direction' => 'ltr', 'format' => '', 'indent' => 0, 'type' => 'root', 'version' => 1,
            ],
        ];
    }
}
