<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * A form whose only form-reading action sits in a section's header 'actions',
 * so the form's rules reach it only if the action-form search walks that key.
 */
class SectionHeaderActionPage extends Page
{
    /** @var array<string, mixed>|null Form payload the last handler received. */
    public static ?array $capturedForm = null;

    public static function path(): string
    {
        return 'section-header-action';
    }

    public function view(S $s): Node
    {
        return $s->stack([$s->form('post', [
            $s->section([
                'title' => 'Post',
                'actions' => [
                    $s->action('saveFromHeader')->handle($this->capture(...), needs: ['form']),
                ],
            ], [
                $s->text('title')->required(),
            ]),
        ])]);
    }

    private function capture(ActionCtx $ctx): Effects
    {
        static::$capturedForm = $ctx->form;

        return Effects::make()->notify('Saved');
    }
}
