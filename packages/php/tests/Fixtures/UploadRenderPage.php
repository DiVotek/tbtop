<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Fixture page with saved upload values, proving render-time url resolution:
 * a private field's stored path becomes a fresh signed view url on page-enter,
 * a public field's becomes a plain /storage url, and a null value stays null.
 */
class UploadRenderPage extends Page
{
    public static function path(): string
    {
        return 'upload-render-page';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('main', [
                $s->upload('secret')->disk('local')->directory('private-docs')->visibility('private'),
                $s->upload('doc')->disk('public')->directory('docs')->visibility('public'),
                $s->upload('blank')->disk('local')->directory('private-docs')->visibility('private'),
            ])->record([
                'secret' => ['path' => 'private-docs/sample.webp', 'filename' => 'confidential.webp'],
                'doc' => ['path' => 'docs/sample.webp', 'filename' => 'public.webp'],
                'blank' => null,
            ])->onSubmit(fn () => null),
        ]);
    }
}
