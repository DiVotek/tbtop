<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * McpOptionsTest: two forms hold a dynamic `city` field. The first sits behind an
 * mcp(false) action, so a lookup by name across the page would read its options.
 */
class McpOptionsPage extends Page
{
    private const CITIES = [
        'ua' => [['value' => 'kyiv', 'label' => 'Kyiv'], ['value' => 'lviv', 'label' => 'Lviv']],
        'pl' => [['value' => 'krakow', 'label' => 'Krakow']],
    ];

    public static function path(): string
    {
        return 'mcp-options';
    }

    public static function can(): ?string
    {
        return 'view-mcp-page';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('hidden', [
                $s->select('city')->query(fn (): array => [['value' => 'secret', 'label' => 'Hidden form city']]),
                $s->action('saveHidden')->mcp(false)->handle(fn (): Effects => Effects::make(), needs: ['form']),
            ]),
            $s->form('trip', [
                $s->select('country')->options([['value' => 'ua', 'label' => 'Ukraine'], ['value' => 'pl', 'label' => 'Poland']]),
                $s->select('city')->dependsOn('country')->query(fn (array $deps, string $search): array => array_values(array_filter(
                    self::CITIES[$deps['country']] ?? [],
                    static fn (array $city): bool => str_contains(strtolower($city['label']), strtolower($search)),
                ))),
                $s->text('note'),
            ])->onSubmit(fn (): Effects => Effects::make()),
        ]);
    }
}
