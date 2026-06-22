<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Fixture page whose path carries a route param ({record}). The signed view
 * route inherits it (records/{record}/edit/uploads/{tbtopField}/view), so the
 * signed-url builder must thread {record} through or Laravel throws on render
 * and on the upload response. Exercises the parametrised + private combination
 * the flat fixtures never reach.
 */
class ParametrisedUploadPage extends Page
{
    public static function path(): string
    {
        return 'records/{record}/edit';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('main', [
                $s->upload('secret')->disk('local')->directory('private-docs')->visibility('private'),
            ])->record([
                'secret' => ['path' => 'private-docs/sample.webp', 'filename' => 'confidential.webp'],
            ])->onSubmit(fn () => null),
        ]);
    }
}
