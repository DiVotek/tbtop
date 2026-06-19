<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * A page with a saved private upload value behind a gate, proving the page gate
 * runs before render-time url resolution.
 */
class GatedUploadRenderPage extends Page
{
    public static function path(): string
    {
        return 'gated-upload-render-page';
    }

    public static function can(): ?string
    {
        return 'view-gated-uploads';
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
