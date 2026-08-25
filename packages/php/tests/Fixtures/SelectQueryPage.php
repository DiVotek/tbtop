<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Support\Collection;
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

    /** @var list<array{filter: string, deps: array<string, string>, search: string}> */
    public static array $tableCalls = [];

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
                // Collection source: what User::pluck('name', 'id') hands back.
                $s->select('author')
                    ->label('Author')
                    ->query(fn (array $deps, string $search): Collection => collect([
                        '1' => 'Alice',
                        '2' => 'Bob',
                    ])),
                // multiple() + query(): resolves its stored list via the values mode.
                $s->select('tags')
                    ->label('Tags')
                    ->multiple()
                    ->query(fn (array $deps, string $search): array => [
                        ['value' => 't1', 'label' => 'Laravel'],
                        ['value' => 't2', 'label' => 'React'],
                    ])
                    ->resolveUsing(fn (string $value): ?string => match ($value) {
                        't1' => 'Laravel',
                        't2' => 'React',
                        default => null,
                    }),
                // Rich rows: display must survive both search and resolve.
                $s->select('car')
                    ->label('Car')
                    ->query(fn (array $deps, string $search): array => [
                        [
                            'value' => 12,
                            'label' => 'Toyota Camry',
                            'display' => [
                                'image' => 'https://cdn.test/12.jpg',
                                'subtitle' => 'Sedan · black',
                            ],
                        ],
                    ])
                    ->resolveUsing(fn (string $value): string|array|null => $value === '12'
                        ? ['label' => 'Toyota Camry', 'display' => ['image' => 'https://cdn.test/12.jpg']]
                        : null),
                // Eloquent-backed sources hand whole models to the closure, so
                // rows routinely carry attributes an option must not publish.
                $s->select('owner')
                    ->label('Owner')
                    ->query(fn (array $deps, string $search): array => [
                        [
                            'value' => 7,
                            'label' => 'Alice',
                            'email' => 'alice@example.test',
                            'password_hash' => 'SECRET',
                            'display' => ['image' => 'https://cdn.test/7.jpg'],
                        ],
                    ]),
                $s->select('status')->label('Status')->options([['value' => 'a', 'label' => 'A']]),
            ])->onSubmit(fn () => null),
            $s->table('primary')
                ->columns(['id' => 'ID'])
                ->filters([
                    $s->select('country')
                        ->label('Country')
                        ->query(function (array $deps, string $search): array {
                            static::$tableCalls[] = [
                                'filter' => 'primary.country',
                                'deps' => $deps,
                                'search' => $search,
                            ];

                            return [[
                                'value' => 'primary',
                                'label' => 'Primary country',
                                'secret' => 'must-not-leak',
                                'display' => ['subtitle' => 'Primary table'],
                            ]];
                        })
                        ->resolveUsing(fn (string $value): string => $value === 'primary' ? 'Primary country' : $value),
                    $s->select('city')
                        ->dependsOn('country')
                        ->query(function (array $deps, string $search): array {
                            static::$tableCalls[] = [
                                'filter' => 'primary.city',
                                'deps' => $deps,
                                'search' => $search,
                            ];

                            return ['par' => 'Paris', 'ber' => 'Berlin'];
                        }),
                    $s->select('tags')
                        ->multiple()
                        ->query(fn (array $deps, string $search): array => [
                            't1' => 'Laravel',
                            't2' => 'React',
                        ]),
                    $s->select('status')->options([['value' => 'active', 'label' => 'Active']]),
                    $s->select('hidden')->query(fn (): array => ['x' => 'Hidden'])->when(false),
                ])
                ->query(fn () => null)
                ->toNode(),
            $s->table('secondary')
                ->columns(['id' => 'ID'])
                ->filters([
                    $s->select('country')->query(fn (): array => ['secondary' => 'Secondary country']),
                ])
                ->query(fn () => null)
                ->toNode(),
            $s->table('hidden_table')
                ->columns(['id' => 'ID'])
                ->filters([
                    $s->select('country')->query(fn (): array => ['hidden' => 'Hidden country']),
                ])
                ->query(fn () => null)
                ->when(false)
                ->toNode(),
        ]);
    }
}
