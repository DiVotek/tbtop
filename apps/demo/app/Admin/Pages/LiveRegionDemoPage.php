<?php

namespace App\Admin\Pages;

use App\Models\City;
use App\Models\User;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\FormBuilder;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/** liveRegion: a server-rendered card that reloads when the watched field changes. */
class LiveRegionDemoPage extends Page
{
    public static function path(): string
    {
        return 'live-region-demo';
    }

    public static function nav(): ?array
    {
        return ['group' => 'System', 'label' => 'Live region demo', 'order' => 98, 'icon' => 'refresh-cw'];
    }

    public function title(): string
    {
        return 'Live region demo';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText('Server-rendered live region')->variant('heading'),
            $s->displayText(
                'The card below is rendered by a PHP closure. Picking a user posts the '.
                'current selection back to the server, the closure runs again, and the '.
                'fresh nodes replace the card — no page reload, no custom client code.',
            )->variant('muted'),
            $this->form($s),
        ]);
    }

    private function form(S $s): FormBuilder
    {
        return $s->form('liveRegionDemo', [
            $s->relation('user_id')->label('User')
                ->query(fn () => User::query()->orderBy('name'))
                ->labelKey('name')->searchable()
                ->rules('nullable|exists:users,id'),
            $s->liveRegion('userCard')
                ->dependsOn('user_id')
                ->render(function (array $deps, S $r): array {
                    $user = User::query()->find($deps['user_id'] ?? null);
                    if ($user === null) {
                        return [$r->displayAlert('Pick a user to see their card.')->color('info')];
                    }
                    $city = City::query()->with('country')->find($user->city_id);

                    return [
                        $r->section(['title' => $user->name, 'variant' => 'card'], [
                            $r->displayKeyValue([
                                'Email' => $user->email,
                                'Role' => $user->role ?? '—',
                                'City' => $city?->name ?? '—',
                                'Country' => $city?->country?->name ?? '—',
                            ]),
                        ]),
                    ];
                }),
            $s->actionsRow([
                $s->action('save')->label('Save')->color('primary')->submit(),
            ]),
        ])
            ->record(['user_id' => null])
            ->onSubmit(fn (ActionCtx $ctx): Effects => Effects::make()
                ->notify('Saved user '.(string) ($ctx->form['user_id'] ?? '—')));
    }
}
