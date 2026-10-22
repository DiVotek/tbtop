<?php

use Illuminate\Foundation\Auth\User as AuthUser;
use Illuminate\Support\Facades\Gate;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Http\PageGate;
use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Tests\TestCase;

uses(TestCase::class);

it('passes the model class of an [ability, Model::class] gate to the policy check', function () {
    $seen = [];
    Gate::before(function ($user, string $ability, array $arguments) use (&$seen): bool {
        $seen[] = [$ability, $arguments];

        return true;
    });
    $this->actingAs(new AuthUser);

    expect(PageGate::passes(['viewAny', AuthUser::class]))->toBeTrue()
        ->and(PageGate::passes('view-reports'))->toBeTrue()
        ->and(PageGate::passes(null))->toBeTrue()
        ->and($seen)->toBe([['viewAny', [AuthUser::class]], ['view-reports', []]]);
});

it('denies when the policy says no', function () {
    Gate::define('viewAny', fn (): bool => false);
    $this->actingAs(new AuthUser);

    $page = new class extends Page
    {
        public static function path(): string
        {
            return 'x';
        }

        /** @return array{0: string, 1: class-string} */
        public static function can(): array
        {
            return ['viewAny', AuthUser::class];
        }

        public function view(S $s): Node
        {
            return $s->stack([]);
        }
    };

    expect(PageGate::allows($page::class))->toBeFalse();
});
