<?php

declare(strict_types=1);

use App\Models\User;

const COLLAPSIBLE_CARD_STATE = <<<'JS'
() => {
    const card = document.querySelector('[data-testid="section-card"]');
    const toggle = card?.querySelector('[data-testid="section-toggle"]');
    const expanded = toggle?.getAttribute('aria-expanded') ?? 'missing';
    const hasBody = card?.textContent?.includes('Enable beta features') ?? false;
    const hasChrome = card?.classList.contains('border') && card?.classList.contains('bg-card');
    return `${expanded}|${hasBody}|${hasChrome}`;
}
JS;

it('expands a collapsed card section authored by the PHP DSL', function () {
    $this->actingAs(User::factory()->create(['role' => 'admin']));
    $page = visit('/admin/playground');

    $page->assertVisible('#app main')
        ->assertScript(COLLAPSIBLE_CARD_STATE, 'false|false|true')
        ->screenshotElement('[data-testid="section-card"]', filename: 'section-card-collapsed');

    $page->click('[data-testid="section-card"] [data-testid="section-toggle"]')
        ->assertScript(COLLAPSIBLE_CARD_STATE, 'true|true|true')
        ->screenshotElement('[data-testid="section-card"]', filename: 'section-card-expanded')
        ->assertNoSmoke();
});
