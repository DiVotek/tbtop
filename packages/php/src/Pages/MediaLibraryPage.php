<?php

namespace Tbtop\Admin\Pages;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;

/**
 * Package-provided page for the media library.
 * Emits a `mediaLibrary` node — the client renderer handles the UI.
 * Register this class in your `tbtop-admin.pages` config to mount it.
 */
class MediaLibraryPage extends Page
{
    public static function path(): string
    {
        return 'media-library';
    }

    public function title(): string
    {
        return 'Media Library';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Content', 'label' => 'Media Library', 'order' => 10];
    }

    public function view(S $s): Node
    {
        return new Node('mediaLibrary', []);
    }
}
