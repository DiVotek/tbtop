<?php

namespace App\Admin\Pages;

use App\Models\City;
use App\Models\Country;
use App\Models\User;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\FormBuilder;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/** Cascading async relation fields: Country -> City -> User wired via dependsOn(). */
class DependentFieldsDemoPage extends Page
{
    public static function path(): string
    {
        return 'dependent-fields-demo';
    }

    public static function nav(): ?array
    {
        return ['group' => 'System', 'label' => 'Dependent fields demo', 'order' => 97, 'icon' => 'globe'];
    }

    public function title(): string
    {
        return 'Dependent fields demo';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText('Cascading async fields')->variant('heading'),
            $s->displayText(
                'Country, City and User options are all backend queries. City depends on '.
                'Country; User depends on City. Changing a parent resets every field below it.',
            )->variant('muted'),
            $this->form($s),
        ]);
    }

    private function form(S $s): FormBuilder
    {
        return $s->form('dependentFieldsDemo', [
            $s->relation('country_id')->label('Country')
                ->query(fn () => Country::query()->orderBy('name'))
                ->labelKey('name')->searchable()
                ->rules('nullable|exists:countries,id'),
            $s->relation('city_id')->label('City')
                ->query(fn (array $deps) => City::query()
                    ->where('country_id', $deps['country_id'] ?? 0)
                    ->orderBy('name'))
                ->labelKey('name')->searchable()
                ->dependsOn('country_id')
                ->whenParentEmpty('disabled')
                ->helperText('Disabled until a country is selected.')
                ->rules('nullable|exists:cities,id'),
            $s->relation('user_id')->label('User')
                ->query(fn (array $deps) => User::query()
                    ->where('city_id', $deps['city_id'] ?? 0)
                    ->orderBy('name'))
                ->labelKey('name')->searchable()
                ->dependsOn('city_id')
                ->whenParentEmpty('empty')
                ->helperText('Stays enabled but lists nothing until a city is selected.')
                ->rules('nullable|exists:users,id'),
            $s->actionsRow([
                $s->action('save')->label('Save selection')->color('primary')->submit(),
            ]),
        ])
            ->record(['country_id' => null, 'city_id' => null, 'user_id' => null])
            ->onSubmit(fn (ActionCtx $ctx): Effects => Effects::make()
                ->notify(sprintf(
                    'Saved: country=%s, city=%s, user=%s',
                    (string) ($ctx->form['country_id'] ?? '—'),
                    (string) ($ctx->form['city_id'] ?? '—'),
                    (string) ($ctx->form['user_id'] ?? '—'),
                )));
    }
}
