<?php

namespace App\Admin\Pages\Concerns;

use App\Admin\Fields\Rating;
use App\Models\User;
use Tbtop\Admin\Dsl\Cond;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;

/**
 * Field sections shared by the post create/edit forms.
 * The slug unique rule differs per page (ignore-current-id on edit).
 */
trait PostFormFields
{
    /** @return list<Node|\Tbtop\Admin\Dsl\Fields\Field> */
    protected function postFormSections(S $s, string $slugUniqueRule): array
    {
        return [
            $s->section(['title' => 'Post'], [
                $s->text('title')->label('Title')->required()->rules('max:200')->translatable(),
                $s->text('intro')->label('Intro')->translatable(),
                $s->slug('slug')->label('Slug')->required()
                    ->set('fromField', 'title')
                    ->rules(['max:200', 'regex:/^[a-z0-9-]+$/', $slugUniqueRule]),
                $s->richtext('body')->label('Body')
                    ->set('placeholder', 'Write something…')->translatable(),
            ]),
            $s->section(['title' => 'Publishing'], [
                $s->boolean('published')->label('Published')->rules('boolean'),
                $s->date('published_at')->label('Published at')->rules('nullable|date')
                    ->hiddenIf('published', '=', false),
                Rating::make('rating')->label('Rating')->max(5)
                    ->set('min', 0)->set('step', 0.1)
                    ->rules('nullable|numeric|min:0|max:5')
                    ->disabledIf(Cond::not(Cond::truthy('published'))),
                $s->select('author_id')->label('Author')
                    ->set('options', $this->authorOptions())
                    ->rules('nullable|exists:users,id'),
            ]),
            $s->section(['title' => 'Sections'], [
                $s->repeater('sections')->label('Sections')
                    ->set('maxItems', 10)
                    ->rules('nullable|array|max:10')
                    ->set('fields', [
                        $s->text('heading')->label('Heading')->required(),
                        $s->textarea('body')->label('Body'),
                        $s->select('type')->label('Type')
                            ->set('options', [
                                ['value' => 'text', 'label' => 'Text'],
                                ['value' => 'link', 'label' => 'Link'],
                            ]),
                        $s->text('url')->label('URL')
                            ->hiddenIf('type', '!=', 'link'),
                    ]),
            ]),
        ];
    }

    /** @return list<array{value: string, label: string}> */
    private function authorOptions(): array
    {
        return User::query()->orderBy('name')->get()
            ->map(fn(User $user): array => [
                'value' => (string) $user->id,
                'label' => $user->name ?? $user->email,
            ])
            ->all();
    }
}
