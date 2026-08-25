<?php

declare(strict_types=1);

use App\Models\User;

beforeEach(function () {
    $this->actingAs(User::factory()->create(['role' => 'admin']));
});

const STATIC_SELECT_PORTAL_PROBE = <<<'JS'
function() {
    const positioner = document.querySelector('[data-testid="select-positioner-framework"]');
    return positioner !== null
        && positioner.parentElement?.parentElement === document.body
        && getComputedStyle(positioner).zIndex === '50';
}
JS;

const STATIC_SELECT_VIEWPORT_PROBE = <<<'JS'
function() {
    const positioner = document.querySelector('[data-testid="select-positioner-framework"]');
    if (!positioner) { return false; }

    const rect = positioner.getBoundingClientRect();
    return rect.top >= 0
        && rect.left >= 0
        && rect.bottom <= window.innerHeight
        && rect.right <= window.innerWidth;
}
JS;

const STATIC_SELECT_SCROLL_PROBE = <<<'JS'
async function() {
    const input = document.querySelector('#framework');
    const positioner = document.querySelector('[data-testid="select-positioner-framework"]');
    if (!input || !positioner) { return false; }

    const before = window.scrollY;
    window.scrollBy(0, -32);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const anchorRect = input.getBoundingClientRect();
    const popupRect = positioner.getBoundingClientRect();
    const gap = Math.min(
        Math.abs(popupRect.bottom - anchorRect.top),
        Math.abs(popupRect.top - anchorRect.bottom),
    );

    return window.scrollY !== before
        && Math.abs(popupRect.left - anchorRect.left) < 2
        && gap <= 8;
}
JS;

const INSTALL_STICKY_HEADER_PROBE = <<<'JS'
function() {
    const option = document.querySelector('[data-testid="select-option-framework"]');
    const positioner = document.querySelector('[data-testid="select-positioner-framework"]');
    if (!option || !positioner) { return false; }

    const optionRect = option.getBoundingClientRect();
    const popupRect = positioner.getBoundingClientRect();
    const flankWidth = 92;
    const table = document.createElement('table');
    table.dataset.testid = 'sticky-header-overlap-probe';
    table.setAttribute('aria-hidden', 'true');
    Object.assign(table.style, {
        position: 'fixed',
        left: `${popupRect.left - flankWidth}px`,
        top: `${optionRect.top}px`,
        width: `${popupRect.width + flankWidth * 2}px`,
        zIndex: '20',
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
    });
    table.innerHTML = `
        <thead style="position:sticky;top:0;z-index:20">
            <tr>
                <th style="width:${flankWidth}px;height:${Math.max(32, optionRect.height)}px;
                    color:#fff;background:#b91c1c;border:2px solid #7f1d1d;font:700 11px sans-serif">
                    z-20 header
                </th>
                <th style="width:${popupRect.width}px;background:#fecaca;border-block:2px solid #ef4444"></th>
                <th style="width:${flankWidth}px;color:#fff;background:#b91c1c;border:2px solid #7f1d1d;
                    font:700 11px sans-serif">
                    z-20 header
                </th>
            </tr>
        </thead>`;
    document.body.append(table);

    const topElement = document.elementFromPoint(
        optionRect.left + 16,
        optionRect.top + optionRect.height / 2,
    );
    return topElement?.closest('[data-testid="select-positioner-framework"]') === positioner;
}
JS;

it('portals the static searchable select above a sticky header and keeps keyboard navigation', function () {
    $page = visit('/admin/playground')
        ->resize(1280, 360)
        ->assertVisible('#app main');

    $page->assertScript(<<<'JS'
        async () => {
            const input = document.querySelector('#framework');
            if (!input) { return false; }

            window.scrollBy(0, input.getBoundingClientRect().top - 168);
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

            return Math.abs(input.getBoundingClientRect().top - 168) < 2;
        }
    JS);

    $page->click('framework')
        ->assertVisible('@select-positioner-framework')
        ->assertScript(STATIC_SELECT_PORTAL_PROBE)
        ->assertScript(STATIC_SELECT_VIEWPORT_PROBE)
        ->assertScript(STATIC_SELECT_SCROLL_PROBE)
        ->assertScript(STATIC_SELECT_VIEWPORT_PROBE)
        ->assertScript(INSTALL_STICKY_HEADER_PROBE)
        ->screenshot(fullPage: false, filename: 'static-searchable-select-overlap');

    $page->script("() => document.querySelector('[data-testid=\"sticky-header-overlap-probe\"]')?.remove()");

    $page->type('framework', 'Sym')
        ->assertVisible('@select-option-framework')
        ->keys('framework', 'ArrowDown')
        ->assertScript("document.activeElement?.id === 'framework'")
        ->keys('framework', 'Enter')
        ->assertSeeIn('@select-label-framework', 'Symfony')
        ->click('framework')
        ->assertVisible('@select-positioner-framework')
        ->keys('framework', 'Escape')
        ->assertMissing('@select-positioner-framework')
        ->click('framework')
        ->assertVisible('@select-positioner-framework')
        ->click('Input prefixes and suffixes')
        ->assertMissing('@select-positioner-framework')
        ->assertNoSmoke();
});
