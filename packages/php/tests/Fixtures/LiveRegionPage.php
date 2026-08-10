<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class LiveRegionPage extends Page
{
    /** @var list<array<string, string>> Deps bags the render closure received. */
    public static array $calls = [];

    public static function path(): string
    {
        return 'live-region-page';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('main', [
                $s->text('title')->label('Title'),
                $s->select('contact')->label('Contact')->options([
                    ['value' => '5', 'label' => 'Alice'],
                    ['value' => '7', 'label' => 'Bob'],
                ]),
                $s->liveRegion('preview')
                    ->dependsOn('contact')
                    ->render(function (array $deps, S $r): array {
                        static::$calls[] = $deps;

                        return [
                            $r->displayText('Contact: '.($deps['contact'] ?? 'none'))->variant('muted'),
                        ];
                    }),
                $s->liveRegion('secret')
                    ->dependsOn('contact')
                    ->render(fn (array $deps, S $r) => [$r->displayText('secret')])
                    ->when(false),
            ])->record(['contact' => '5']),
            $s->form('hidden', [
                $s->liveRegion('ghost')
                    ->dependsOn('contact')
                    ->render(fn (array $deps, S $r) => [$r->displayText('ghost')]),
            ])->when(false),
        ]);
    }
}
