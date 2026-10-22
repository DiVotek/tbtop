<?php

namespace App\Admin;

use App\Http\Middleware\DemoNavigationLayout;
use App\Http\Middleware\DemoStylePreset;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Panels\Chrome;
use Tbtop\Admin\Panels\CurrentPanel;
use Tbtop\Admin\Panels\PanelConfig;

/**
 * Demo chrome: the stock shell plus a notifications bell and layout switcher
 * in the header and a footer note — the reference "spread defaults + append" pattern.
 */
class DemoChrome extends Chrome
{
    protected function headerItems(S $s): array
    {
        return [
            $s->notifications(),
            $this->layoutSwitcher($s),
            ...parent::headerItems($s),
        ];
    }

    /**
     * Visits the current page with ?nav=<layout> or ?style=<preset>;
     * DemoNavigationLayout and DemoStylePreset keep the pick for the session.
     */
    private function layoutSwitcher(S $s): Node
    {
        $currentNav = session(DemoNavigationLayout::SESSION_KEY) ?? CurrentPanel::current()?->navigation();
        $navigation = array_map(
            fn (string $layout) => $s->action("layout-{$layout}")
                ->label($layout === $currentNav ? "✓ {$layout}" : $layout)
                ->url(request()->url().'?nav='.$layout),
            PanelConfig::NAVIGATIONS,
        );

        $currentStyle = DemoStylePreset::chosen() ?? CurrentPanel::current()?->appearance()['stylePreset'] ?? 'vega';
        $styles = array_map(
            fn (string $style) => $s->action("style-{$style}")
                ->label($style === $currentStyle ? "✓ Style: {$style}" : "Style: {$style}")
                ->url(request()->url().'?style='.$style),
            DemoStylePreset::STYLES,
        );

        return $s->dropdown('Layout', [...$navigation, ...$styles]);
    }

    public function footer(S $s): ?Node
    {
        return $s->row([
            $s->displayText('Tabletop demo — shell authored by DemoChrome')->variant('muted'),
        ]);
    }
}
