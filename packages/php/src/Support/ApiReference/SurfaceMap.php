<?php

namespace Tbtop\Admin\Support\ApiReference;

use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\CommandPalette\Command;
use Tbtop\Admin\CommandPalette\CommandPaletteConfig;
use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\AlertBlock;
use Tbtop\Admin\Dsl\ChartBuilder;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\DisplayImageBlock;
use Tbtop\Admin\Dsl\DisplayValueBlock;
use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\FormBuilder;
use Tbtop\Admin\Dsl\ListBuilder;
use Tbtop\Admin\Dsl\LiveRegionBuilder;
use Tbtop\Admin\Dsl\MarkdownBlock;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Dsl\Stat;
use Tbtop\Admin\Dsl\Tab;
use Tbtop\Admin\Dsl\TableBuilder;
use Tbtop\Admin\Dsl\TextBlock;
use Tbtop\Admin\Navigation\NavGroup;
use Tbtop\Admin\Navigation\NavItem;
use Tbtop\Admin\Notifications\Notification;
use Tbtop\Admin\Notifications\NotificationAction;
use Tbtop\Admin\Panels\Chrome;
use Tbtop\Admin\Panels\PanelConfig;

/**
 * Which classes are documented, and which generated file each lands in.
 *
 * Layout blocks are deliberately absent: their vocabulary lives in inline
 * assertKnownKeys() literals that reflection cannot see, so they stay
 * hand-written in docs/ai/authoring-pages.md.
 *
 * @internal
 */
final class SurfaceMap
{
    /** @return array<string, array{title: string, intro: string, classes: array<string, class-string>}> */
    public static function all(): array
    {
        return [
            'fields' => [
                'title' => 'Fields',
                'intro' => 'Every field builder and its wire kind. **Every field** comes first — those methods apply to all kinds; the per-kind sections list only what that kind adds.',
                'classes' => ['Every field' => Field::class, ...self::fieldClasses()],
            ],
            'tables' => [
                'title' => 'Tables',
                'intro' => 'The table builder, its columns, and filter tabs.',
                'classes' => [
                    'TableBuilder' => TableBuilder::class,
                    'Column' => Column::class,
                    'Tab' => Tab::class,
                ],
            ],
            'actions' => [
                'title' => 'Actions and effects',
                'intro' => 'Action authoring and the closed effect vocabulary an action handler returns.',
                'classes' => [
                    'ActionBuilder' => ActionBuilder::class,
                    'Effects' => Effects::class,
                    'FormBuilder' => FormBuilder::class,
                ],
            ],
            'panel' => [
                'title' => 'Panel, navigation and command palette',
                'intro' => 'Panel-level configuration: routing, appearance, navigation, chrome and the command palette.',
                'classes' => [
                    'PanelConfig' => PanelConfig::class,
                    'Chrome' => Chrome::class,
                    'NavGroup' => NavGroup::class,
                    'NavItem' => NavItem::class,
                    'CommandPaletteConfig' => CommandPaletteConfig::class,
                    'Command' => Command::class,
                ],
            ],
            'builder' => [
                'title' => 'The `S` builder',
                'intro' => 'Everything reachable from the `S` instance injected into `view(S $s)`. Field factories are magic `__call` dispatch and are listed in [fields.md](./fields.md) instead; layout-block option vocabularies are hand-documented in [authoring-pages.md](../authoring-pages.md#layout-blocks).',
                'classes' => ['S' => S::class],
            ],
            'blocks' => [
                'title' => 'Display blocks, stats and charts',
                'intro' => 'Read-only content blocks plus the stat, chart, list and live-region builders. Layout blocks (`stack`/`grid`/`section`/`flex`) take option arrays rather than fluent methods and are documented in [authoring-pages.md](../authoring-pages.md#layout-blocks).',
                'classes' => [
                    'TextBlock' => TextBlock::class,
                    'AlertBlock' => AlertBlock::class,
                    'MarkdownBlock' => MarkdownBlock::class,
                    'DisplayValueBlock' => DisplayValueBlock::class,
                    'DisplayImageBlock' => DisplayImageBlock::class,
                    'Stat' => Stat::class,
                    'ChartBuilder' => ChartBuilder::class,
                    'ListBuilder' => ListBuilder::class,
                    'LiveRegionBuilder' => LiveRegionBuilder::class,
                ],
            ],
            'notifications' => [
                'title' => 'Notifications',
                'intro' => 'Database notifications surfaced in the admin bell. Backed by Laravel\'s `database` channel — the payload is page-independent, so actions are links only, never server closures.',
                'classes' => [
                    'Notification' => Notification::class,
                    'NotificationAction' => NotificationAction::class,
                ],
            ],
        ];
    }

    /**
     * Built-ins only: the live kind map also carries consumer kinds from
     * S::register(), which must not leak into the package's own reference.
     *
     * @return array<string, class-string>
     */
    private static function fieldClasses(): array
    {
        $classes = [];

        foreach (S::builtInKindClasses() as $kind => $class) {
            if (! in_array($kind, S::BUILT_IN_KINDS, true)) {
                continue;
            }
            $short = substr((string) strrchr($class, '\\'), 1);
            $classes[$short.' ('.$kind.')'] = $class;
        }

        ksort($classes);

        return $classes;
    }
}
