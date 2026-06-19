<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Upload fixture behind a gate, proving the upload endpoint inherits the page
 * gate via AuthorizesPage exactly like every other page-scoped endpoint.
 */
class GatedUploadPage extends Page
{
    public static function path(): string
    {
        return 'gated-upload-page';
    }

    public static function can(): ?string
    {
        return 'view-gated-uploads';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('main', [
                $s->upload('avatar')->disk('public')->directory('avatars'),
            ])->onSubmit(fn () => null),
        ]);
    }
}
