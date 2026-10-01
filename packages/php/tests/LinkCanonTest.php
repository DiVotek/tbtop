<?php

use Tbtop\Admin\CommandPalette\Command;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Dsl\Stat;
use Tbtop\Admin\Navigation\NavItem;
use Tbtop\Admin\Notifications\NotificationAction;

/**
 * Run $fn under a test-local error handler (Laravel drops deprecations in
 * unit tests) and return its result plus every error raised.
 *
 * @return array{0: mixed, 1: list<array{0: int, 1: string}>}
 */
function linkCanonCapture(Closure $fn): array
{
    $caught = [];
    set_error_handler(function (int $errno, string $message) use (&$caught): bool {
        $caught[] = [$errno, $message];

        return true;
    });
    try {
        return [$fn(), $caught];
    } finally {
        restore_error_handler();
    }
}

dataset('deprecated link aliases', [
    'NavItem::newTab' => [
        fn () => NavItem::make('Docs')->url('/d')->newTab()->toArray(),
        fn () => NavItem::make('Docs')->url('/d')->openUrlInNewTab()->toArray(),
        'NavItem::newTab() is deprecated and will be removed in 1.0. Use url()->openUrlInNewTab() instead.',
    ],
    'Command::openInNewTab' => [
        fn () => Command::make('GitHub')->url('/g')->openInNewTab()->toArray(),
        fn () => Command::make('GitHub')->url('/g')->openUrlInNewTab()->toArray(),
        'Command::openInNewTab() is deprecated and will be removed in 1.0. Use url()->openUrlInNewTab() instead.',
    ],
    'NotificationAction::openInNewTab' => [
        fn () => NotificationAction::make('View')->url('/n')->openInNewTab()->toArray(),
        fn () => NotificationAction::make('View')->url('/n')->openUrlInNewTab()->toArray(),
        'NotificationAction::openInNewTab() is deprecated and will be removed in 1.0. Use url()->openUrlInNewTab() instead.',
    ],
    'Stat::openInNewTab' => [
        fn () => Stat::make('Posts')->value(3)->url('/s')->openInNewTab()->toNode()->jsonSerialize(),
        fn () => Stat::make('Posts')->value(3)->url('/s')->openUrlInNewTab()->toNode()->jsonSerialize(),
        'Stat::openInNewTab() is deprecated and will be removed in 1.0. Use url()->openUrlInNewTab() instead.',
    ],
    'ActionBuilder::visit new tab' => [
        fn () => (new S)->action('a')->visit('/x', newTab: true)->toNode()->jsonSerialize(),
        fn () => (new S)->action('a')->url('/x')->openUrlInNewTab()->toNode()->jsonSerialize(),
        'ActionBuilder::visit() is deprecated and will be removed in 1.0. Use url()->openUrlInNewTab() instead.',
    ],
    'ActionBuilder::visit same tab' => [
        fn () => (new S)->action('a')->visit('/x')->toNode()->jsonSerialize(),
        fn () => (new S)->action('a')->url('/x')->toNode()->jsonSerialize(),
        'ActionBuilder::visit() is deprecated and will be removed in 1.0. Use url() instead.',
    ],
]);

it('deprecated aliases warn and keep behavior', function (Closure $alias, Closure $canon, string $message) {
    [$old, $errors] = linkCanonCapture($alias);
    [$new, $canonErrors] = linkCanonCapture($canon);

    expect(json_encode($old))->toBe(json_encode($new))
        ->and($errors)->toBe([[E_USER_DEPRECATED, $message]])
        ->and($canonErrors)->toBe([]);
})->with('deprecated link aliases');

it('Action url() is order-independent', function () {
    $flagFirst = (new S)->action('a')->openUrlInNewTab()->url('/x')->toNode()->options['spec'];
    $urlFirst = (new S)->action('a')->url('/x')->openUrlInNewTab()->toNode()->options['spec'];

    expect($flagFirst)->toBe($urlFirst)
        ->and($flagFirst)->toBe(['type' => 'visit', 'href' => '/x', 'newTab' => true]);
});
