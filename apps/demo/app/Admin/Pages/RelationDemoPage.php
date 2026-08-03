<?php

namespace App\Admin\Pages;

use App\Models\User;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Showcases the two server-driven async option sources side by side:
 * relation() searching users through relation-search, and select()->query()
 * serving a plain PHP array through select-options — no database involved.
 * Kept on its own page so the post form's select-with-create demo stays intact.
 */
class RelationDemoPage extends Page
{
    /** Deliberately not a table: query() exists for sources Eloquent cannot reach. */
    private const TIMEZONES = [
        'Europe/Kyiv' => 'Kyiv (UTC+2)',
        'Europe/Berlin' => 'Berlin (UTC+1)',
        'America/New_York' => 'New York (UTC-5)',
        'Asia/Tokyo' => 'Tokyo (UTC+9)',
    ];

    public static function path(): string
    {
        return 'relation-demo';
    }

    public static function nav(): ?array
    {
        return ['group' => 'System', 'label' => 'Relation field demo', 'order' => 98, 'icon' => 'globe'];
    }

    public function title(): string
    {
        return 'Relation field demo';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText('Async relation field')->variant('heading'),
            $s->form('relationDemo', [
                $s->relation('author_id')->label('Author')
                    ->query(fn () => User::query()->orderBy('name'))
                    ->labelKey('name')
                    ->searchable()
                    ->rules('nullable|exists:users,id'),
                $s->actionsRow([
                    $s->action('save')->label('Save')->color('primary')->submit(),
                ]),
            ])
                ->record(['author_id' => null])
                ->onSubmit(fn (ActionCtx $ctx): Effects => Effects::make()
                    ->notify('Selected author id: '.((string) ($ctx->form['author_id'] ?? '—')))),

            $s->displayText('Async select over a non-database source')->variant('heading'),
            $s->form('selectQueryDemo', [
                // Filtering and the result cap belong to the closure — nothing
                // trims on its behalf. Returning a value => label map also lets
                // a stored value resolve its label with no resolveUsing().
                $s->select('timezone')->label('Timezone')
                    ->query(function (array $deps, string $search): array {
                        if ($search === '') {
                            return self::TIMEZONES;
                        }

                        return array_filter(
                            self::TIMEZONES,
                            fn (string $label): bool => str_contains(
                                mb_strtolower($label),
                                mb_strtolower($search),
                            ),
                        );
                    })
                    ->rules('nullable|string'),
                $s->actionsRow([
                    $s->action('saveTimezone')->label('Save')->color('primary')->submit(),
                ]),
            ])
                ->record(['timezone' => 'Europe/Kyiv'])
                ->onSubmit(fn (ActionCtx $ctx): Effects => Effects::make()
                    ->notify('Selected timezone: '.((string) ($ctx->form['timezone'] ?? '—')))),
        ]);
    }
}
