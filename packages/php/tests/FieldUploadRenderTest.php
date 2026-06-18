<?php

use Carbon\Carbon;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Tbtop\Admin\Tests\FieldUploadHttpTestCase;

uses(FieldUploadHttpTestCase::class);

beforeEach(function (): void {
    Storage::fake('public');
    Storage::fake('local');
});

/** Pull the rendered form record straight off the Inertia data prop. */
function renderRecord(object $test): array
{
    return $test->get('/admin/upload-render-page', ['X-Inertia' => 'true'])
        ->assertOk()
        ->json('props.data.main');
}

it('Render: a saved private value becomes a signed view url', function (): void {
    $record = renderRecord($this);

    expect($record['secret']['url'])
        ->toContain('/upload-render-page/uploads/secret/view')
        ->toContain('signature=')
        ->toContain('expires=');
    expect($record['secret']['filename'])->toBe('confidential.webp');
});

it('Render: a saved public value becomes a /storage url with no signature', function (): void {
    $record = renderRecord($this);

    expect($record['doc']['url'])
        ->toStartWith('/storage')
        ->not->toContain('signature=');
});

it('Render: the signed url streams the file end to end', function (): void {
    Storage::disk('local')->put('private-docs/sample.webp', 'webp-bytes');

    $url = renderRecord($this)['secret']['url'];

    $this->get($url)->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
});

it('Render: each render produces a fresh signature', function (): void {
    Carbon::setTestNow('2026-06-18 10:00:00');
    $first = renderRecord($this)['secret']['url'];

    Carbon::setTestNow('2026-06-18 10:00:01');
    $second = renderRecord($this)['secret']['url'];

    $sig = static fn (string $u): string => (string) parse_url($u, PHP_URL_QUERY);
    expect($sig($first))->not->toBe($sig($second));
});

it('Render: a null upload value stays null', function (): void {
    expect(renderRecord($this)['blank'])->toBeNull();
});

it('Render: the page gate runs before url resolution', function (): void {
    Gate::define('view-gated-uploads', fn (?object $user) => false);

    $this->get('/admin/gated-upload-render-page', ['X-Inertia' => 'true'])
        ->assertForbidden();
});
