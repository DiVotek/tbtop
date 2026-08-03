<?php

use Tbtop\Admin\Tests\Fixtures\WhenEndpointsPage;
use Tbtop\Admin\Tests\WhenEndpointHttpTestCase;

uses(WhenEndpointHttpTestCase::class);

// ---------------------------------------------------------------------------
// A when(false) node's endpoints are not reachable
// ---------------------------------------------------------------------------
// S::action()/form()/table()/chart() register the builder the moment it is
// constructed, before any serialization decision. Filtering the tree alone
// would hide the node while leaving its endpoint live and callable, so every
// controller that resolves an entity by name re-checks the condition.
//
// Each case is paired with its visible twin: a guard that 404s indiscriminately
// would satisfy the first half and fail the second.

it('404s the action endpoint of a when(false) action', function (): void {
    $this->postJson('/admin/when-endpoints/actions/hidden_action', ['payload' => []])
        ->assertNotFound();
});

it('still runs the action endpoint of a visible action', function (): void {
    $this->postJson('/admin/when-endpoints/actions/shown_action', ['payload' => []])
        ->assertOk();
});

it('404s the action-data endpoint of a when(false) modal action', function (): void {
    $this->postJson('/admin/when-endpoints/actions/hidden_modal/data', ['payload' => []])
        ->assertNotFound();
});

it('still serves the action-data endpoint of a visible modal action', function (): void {
    $this->postJson('/admin/when-endpoints/actions/shown_modal/data', ['payload' => []])
        ->assertOk();
});

it('404s the form submit endpoint of a when(false) form', function (): void {
    $this->post('/admin/when-endpoints/forms/hidden', ['name' => 'X'])
        ->assertNotFound();
});

it('still accepts the form submit endpoint of a visible form', function (): void {
    $this->post('/admin/when-endpoints/forms/shown', ['name' => 'X'])
        ->assertRedirect();
});

it('404s the table data endpoint of a when(false) table', function (): void {
    $this->getJson('/admin/when-endpoints/tables/hidden_table')->assertNotFound();
});

it('still serves the table data endpoint of a visible table', function (): void {
    $this->getJson('/admin/when-endpoints/tables/shown_table')->assertOk();
});

it('404s the table reorder endpoint of a when(false) table', function (): void {
    $this->postJson('/admin/when-endpoints/tables/hidden_table/reorder', ['ids' => []])
        ->assertNotFound();
});

it('404s the editable cell endpoint of a when(false) table', function (): void {
    $this->postJson(
        '/admin/when-endpoints/cells/hidden_table/name',
        ['payload' => ['id' => 1, 'value' => 'X']],
    )->assertNotFound();
});

it('404s the chart data endpoint of a when(false) chart', function (): void {
    $this->getJson('/admin/when-endpoints/data/hidden_chart')->assertNotFound();
});

it('still serves the chart data endpoint of a visible chart', function (): void {
    $this->getJson('/admin/when-endpoints/data/shown_chart')->assertOk();
});

it('404s the upload endpoint of a when(false) upload field', function (): void {
    $this->postJson('/admin/when-endpoints/uploads/hidden_upload', [])->assertNotFound();
});

it('404s the select-options endpoint of a when(false) select', function (): void {
    $this->postJson('/admin/when-endpoints/select-options/hidden_pick', ['search' => ''])
        ->assertNotFound();
});

it('still serves the select-options endpoint of a visible select', function (): void {
    $this->postJson('/admin/when-endpoints/select-options/shown_pick', ['search' => ''])
        ->assertOk();
});

it('404s the select-create endpoint of a when(false) select', function (): void {
    $this->postJson('/admin/when-endpoints/select-create/hidden_new', ['title' => 'X'])
        ->assertNotFound();
});

it('still serves the select-create endpoint of a visible select', function (): void {
    $this->postJson('/admin/when-endpoints/select-create/shown_new', ['title' => 'X'])
        ->assertOk();
});

it('404s the relation-search endpoint of a when(false) relation field', function (): void {
    $this->postJson('/admin/when-endpoints/relation-search/hidden_rel', ['search' => ''])
        ->assertNotFound();
});

it('still serves the relation-search endpoint of a visible relation field', function (): void {
    $this->postJson('/admin/when-endpoints/relation-search/shown_rel', ['search' => ''])
        ->assertOk();
});

// ---------------------------------------------------------------------------
// The condition is re-read per request
// ---------------------------------------------------------------------------
// ResolvedPage rebuilds the page on every request, so the guard must consult
// the closure then — not a verdict frozen when the page was first rendered.

it('re-evaluates the when closure on each endpoint request', function (): void {
    WhenEndpointsPage::$allow = false;
    $this->postJson('/admin/when-endpoints/actions/toggled_action', ['payload' => []])
        ->assertNotFound();

    WhenEndpointsPage::$allow = true;
    $this->postJson('/admin/when-endpoints/actions/toggled_action', ['payload' => []])
        ->assertOk();
});

// ---------------------------------------------------------------------------
// The excluded entities are absent from the rendered page too
// ---------------------------------------------------------------------------

it('omits every when(false) entity from the rendered page', function (): void {
    $body = $this->get('/admin/when-endpoints', ['X-Inertia' => 'true'])
        ->assertOk()
        ->getContent();

    expect($body)->not->toContain('hidden_action')
        ->and($body)->not->toContain('hidden_table')
        ->and($body)->not->toContain('hidden_chart')
        ->and($body)->not->toContain('hidden_upload')
        ->and($body)->toContain('shown_action');
});
