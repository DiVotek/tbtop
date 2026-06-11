<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Minimal page used by SelectCreateHttpTest to exercise the create endpoint.
 */
class SelectCreatablePage extends Page
{
    /** @var array<string, mixed>|null Captured validated payload for assertions. */
    public static ?array $created = null;

    public static function path(): string
    {
        return 'select-create-page';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('main', [
                $s->select('author_id')
                    ->label('Author')
                    ->creatable(
                        fields: [
                            $s->text('name')->label('Name')->required(),
                        ],
                        using: function (array $validated): array {
                            static::$created = $validated;

                            return ['value' => '99', 'label' => $validated['name']];
                        },
                    ),
            ])->onSubmit(fn () => null),
        ]);
    }
}
