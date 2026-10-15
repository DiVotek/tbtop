<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * An edit form whose record already stores upload paths, so a submit can be
 * checked against "unchanged", "issued this session" and "someone else's".
 */
class UploadBindingPage extends Page
{
    /** @var list<array<string, mixed>> */
    public static array $saved = [];

    public static function path(): string
    {
        return 'upload-binding-page';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('edit', [
                $s->upload('avatar')->disk('public')->directory('avatars'),
                $s->upload('gallery')->disk('public')->directory('avatars')->multiple(),
            ])->record([
                'avatar' => 'avatars/current.png',
                'gallery' => ['avatars/g1.png', 'avatars/g2.png'],
            ])->onSubmit(function (ActionCtx $ctx): null {
                self::$saved[] = $ctx->form;

                return null;
            }),
        ]);
    }
}
