<?php

use Tbtop\Admin\Tests\Fixtures\RichtextEmbedsPage;

/** @param  array<string, mixed>  $data */
function documentWithCallout(array $data): array
{
    return ['root' => [
        'type' => 'root', 'version' => 1, 'direction' => null, 'format' => '', 'indent' => 0,
        'children' => [
            ['type' => 'embed', 'version' => 1, 'id' => '7f1c1a52-4b8e-4f6e-9d51-2c7a0f0e2d11', 'kind' => 'callout', 'data' => $data],
        ],
    ]];
}

beforeEach(function (): void {
    config()->set('tbtop-admin.content_locales', ['en', 'uk']);
    config()->set('tbtop-admin.default_content_locale', 'en');
});

it('rejects a save whose embed misses a required field, on the field key', function () {
    $response = $this->postJson('/admin/richtext-embeds/forms/doc', [
        'body' => documentWithCallout(['title' => '', 'text' => 'x']),
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors(['body']);
    expect($response->json('errors.body.0'))->toStartWith('Block «Callout» #1: ')
        ->and($response->json('errors.body.0'))->toContain('Title')
        ->and(RichtextEmbedsPage::$submitted)->toBeNull();
});

it('validates embeds in a non-default locale of a translatable richtext', function () {
    $response = $this->postJson('/admin/richtext-embeds/forms/doc', [
        'intro' => [
            'en' => documentWithCallout(['title' => 'Fine']),
            'uk' => documentWithCallout(['title' => '']),
        ],
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors(['intro.uk'])
        ->assertJsonMissingValidationErrors(['intro.en']);
    expect($response->json('errors')['intro.uk'][0])->toStartWith('Block «Callout» #1: ')
        ->and(RichtextEmbedsPage::$submitted)->toBeNull();
});
