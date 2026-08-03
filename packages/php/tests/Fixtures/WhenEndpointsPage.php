<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Support\Facades\DB;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Every page-scoped endpoint twice over: one entity excluded by when(false)
 * and a visible twin. The pair is the point — a guard that 404s everything
 * would pass the excluded half of each test and fail the visible half.
 *
 * The condition reads a static flag rather than a literal so a test can prove
 * the closure is re-evaluated per request instead of frozen at render time.
 */
class WhenEndpointsPage extends Page
{
    /** Flips the when() condition; read on every page assembly. */
    public static bool $allow = false;

    public static function path(): string
    {
        return 'when-endpoints';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            // The field endpoints resolve a field by name across every
            // registered form, so an excluded form has to carry one of each
            // kind: a plain text field alone would let a walk that ignores the
            // form's own verdict pass unnoticed.
            $s->form('hidden', [
                $s->text('name')->required()->default('form_level_secret'),
                $s->upload('form_hidden_upload'),
                $s->select('form_hidden_pick')
                    ->query(fn (array $deps, string $search): array => ['1' => 'A']),
                $s->select('form_hidden_new')
                    ->creatable(
                        fields: [$s->text('title')->required()],
                        using: fn (array $validated): array => ['value' => '1', 'label' => $validated['title']],
                    ),
                $s->relation('form_hidden_rel')
                    ->labelKey('name')
                    ->searchable()
                    ->query(fn () => AuthorModel::query()),
            ])
                ->onSubmit(fn (ActionCtx $ctx): Effects => Effects::make()->notify('saved'))
                ->when(false),
            $s->form('shown', [
                $s->text('name'),
                $s->upload('hidden_upload')->when(false),
                $s->upload('shown_upload'),
                $s->select('hidden_pick')
                    ->query(fn (array $deps, string $search): array => ['1' => 'A'])
                    ->when(false),
                $s->select('shown_pick')
                    ->query(fn (array $deps, string $search): array => ['1' => 'A']),
                $s->select('hidden_new')
                    ->creatable(
                        fields: [$s->text('title')->required()],
                        using: fn (array $validated): array => ['value' => '1', 'label' => $validated['title']],
                    )
                    ->when(false),
                $s->select('shown_new')
                    ->creatable(
                        fields: [$s->text('title')->required()],
                        using: fn (array $validated): array => ['value' => '1', 'label' => $validated['title']],
                    ),
                $s->relation('hidden_rel')
                    ->labelKey('name')
                    ->searchable()
                    ->query(fn () => AuthorModel::query())
                    ->when(false),
                $s->relation('shown_rel')
                    ->labelKey('name')
                    ->searchable()
                    ->query(fn () => AuthorModel::query()),
            ])->onSubmit(fn (ActionCtx $ctx): Effects => Effects::make()->notify('saved')),

            $s->action('hidden_action')
                ->handle(fn (ActionCtx $ctx): Effects => Effects::make()->notify('ran'), needs: [])
                ->when(false),
            $s->action('shown_action')
                ->handle(fn (ActionCtx $ctx): Effects => Effects::make()->notify('ran'), needs: []),
            $s->action('hidden_modal')
                ->modal('T')
                ->query(fn (ActionCtx $ctx): array => ['a' => 1], needs: [])
                ->when(false),
            $s->action('shown_modal')
                ->modal('T')
                ->query(fn (ActionCtx $ctx): array => ['a' => 1], needs: []),

            self::table($s, 'hidden_table')->when(false)->toNode(),
            self::table($s, 'shown_table')->toNode(),

            $s->chart('hidden_chart', 'donut', ['nameKey' => 'label'])
                ->query(fn () => [['label' => 'A', 'value' => 1]])
                ->when(false)
                ->toNode(),
            $s->chart('shown_chart', 'donut', ['nameKey' => 'label'])
                ->query(fn () => [['label' => 'A', 'value' => 1]])
                ->toNode(),

            // Re-evaluated per request: the guard must consult the closure on
            // the endpoint call, not a decision cached when the page rendered.
            $s->action('toggled_action')
                ->handle(fn (ActionCtx $ctx): Effects => Effects::make()->notify('ran'), needs: [])
                ->when(fn (): bool => static::$allow),
        ]);
    }

    private static function table(S $s, string $name)
    {
        return $s->table($name)
            ->columns([
                Column::make('name')
                    ->label('Name')
                    ->textInput()
                    ->onSave(fn (mixed $record, mixed $value) => null),
            ])
            ->reorderable('position')
            ->query(fn () => DB::table('when_items'));
    }
}
