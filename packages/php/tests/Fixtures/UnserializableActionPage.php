<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * A handler action that toNode() refuses to serialize — slideOver() is only
 * valid on modal actions, and nothing validates that at build time.
 *
 * Running it must still work: the POST path resolves a handler by name and has
 * no reason to serialize anything. Kept on its own page because the throw makes
 * the page unrenderable, which would break any GET against it.
 */
class UnserializableActionPage extends Page
{
    public static bool $ran = false;

    public static bool $headerRan = false;

    public static function path(): string
    {
        return 'unserializable-action';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('post', [
                $s->text('title')->required(),
                $s->action('slideOverHandler')
                    ->handle($this->run(...), needs: ['row'])
                    ->slideOver(),
            ]),
        ]);
    }

    /**
     * The same refusal, one level out. Tests POST to the neighbour: an
     * unrenderable sibling must not decide whether an unrelated action runs.
     */
    public function headerActions(S $s): array
    {
        return [
            $s->action('headerSlideOver')
                ->handle($this->run(...), needs: ['row'])
                ->slideOver(),
            $s->action('headerOk')->handle($this->runHeader(...), needs: ['row']),
        ];
    }

    private function run(ActionCtx $ctx): Effects
    {
        static::$ran = true;

        return Effects::make()->notify('Ran');
    }

    private function runHeader(ActionCtx $ctx): Effects
    {
        static::$headerRan = true;

        return Effects::make()->notify('Ran');
    }
}
