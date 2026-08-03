<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Fixture page for SelectOptionsHttpTest. The option sources are plain PHP
 * arrays on purpose — the point of query() is that it never touches Eloquent.
 */
class SelectQueryPage extends Page
{
    /** @var list<array{deps: array<string, string>, search: string}> Captured closure arguments. */
    public static array $calls = [];

    private const COUNTRIES = [
        'fr' => 'France',
        'de' => 'Germany',
        'gr' => 'Greece',
    ];

    private const CITIES = [
        'fr' => [['value' => 'par', 'label' => 'Paris']],
        'de' => [['value' => 'ber', 'label' => 'Berlin']],
    ];

    public static function path(): string
    {
        return 'select-query-page';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('main', [
                // Associative map source: labels resolve without resolveUsing().
                $s->select('country')
                    ->label('Country')
                    ->query(function (array $deps, string $search): array {
                        static::$calls[] = ['deps' => $deps, 'search' => $search];

                        if ($search === '') {
                            return self::COUNTRIES;
                        }

                        return array_filter(
                            self::COUNTRIES,
                            fn (string $label): bool => str_contains(strtolower($label), strtolower($search)),
                        );
                    }),
                // List-of-rows source: resolve falls through to resolveUsing().
                $s->select('city')
                    ->label('City')
                    ->dependsOn('country')
                    ->query(fn (array $deps, string $search): array => self::CITIES[$deps['country'] ?? ''] ?? [])
                    ->resolveUsing(fn (string $value): ?string => $value === 'par' ? 'Paris' : null),
                // List-of-rows source with no resolver: raw value is displayed.
                $s->select('color')
                    ->label('Color')
                    ->query(fn (array $deps, string $search): array => [
                        ['value' => 'red', 'label' => 'Red'],
                    ]),
                $s->select('status')->label('Status')->options([['value' => 'a', 'label' => 'A']]),
            ])->onSubmit(fn () => null),
        ]);
    }
}
