<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Support\Facades\DB;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Fixture page used by PageGateHttpTest.
 * All page-scoped endpoints (form, action, table, data, select-create) hang off it.
 * The gate 'view-gated-endpoints' controls access.
 */
class GatedEndpointsPage extends Page
{
    /** @var array<string, mixed>|null Captured form payload for assertions. */
    public static ?array $submitted = null;

    public static function path(): string
    {
        return 'gated-endpoints';
    }

    public static function can(): ?string
    {
        return 'view-gated-endpoints';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('main', [
                $s->text('name')->label('Name')->required(),
                $s->select('category_id')
                    ->label('Category')
                    ->creatable(
                        fields: [$s->text('title')->label('Title')->required()],
                        using: function (array $validated): array {
                            return ['value' => '1', 'label' => $validated['title']];
                        },
                    ),
            ])->onSubmit(function (ActionCtx $ctx): Effects {
                static::$submitted = $ctx->form;

                return Effects::make()->notify('Saved');
            }),
            $s->action('ping')
                ->label('Ping')
                ->handle(fn (ActionCtx $ctx): Effects => Effects::make()->notify('pong'), needs: []),
            $s->table('items')
                ->columns(['name' => 'Name'])
                ->query(fn () => DB::table('items'))
                ->toNode(),
            $s->chart('summary', 'donut', ['nameKey' => 'label'])
                ->query(fn () => [['label' => 'A', 'value' => 1]])
                ->toNode(),
        ]);
    }
}
