<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Fixture page exercising the page-scoped upload endpoint. Each field carries a
 * different inline config so the HTTP test can assert disk/dir, conversion and
 * mime rejection straight off the resolved node.
 */
class UploadFieldPage extends Page
{
    public static function path(): string
    {
        return 'upload-field-page';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('main', [
                $s->upload('avatar')->disk('public')->directory('avatars'),
                $s->upload('cover')->disk('public')->directory('covers')
                    ->convertTo('webp')->quality(80),
                $s->upload('doc')->disk('public')->directory('docs')->accept('image/*'),
                // Private disk: previews only through the signed stream endpoint.
                $s->upload('secret')->disk('local')->directory('private-docs')->visibility('private'),
                // Private with a custom save closure (pluggable storage).
                $s->upload('custom')->disk('local')->directory('private-docs')->visibility('private')
                    ->saveUsing(fn ($file, $config): array => [
                        'path' => 'private-docs/custom.bin',
                        'url' => '/unused',
                    ]),
            ])->onSubmit(fn () => null),
        ]);
    }
}
