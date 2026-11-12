<?php

use Illuminate\Http\Request;
use Tbtop\Admin\Http\RichtextInput;
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

// TrimStrings / ConvertEmptyStringsToNull run before the controller; the document survives them.

/** A paragraph split at a bold run, the way Lexical stores "Hello **world** again". */
function boldRunDocument(array $embedData): array
{
    $text = fn (string $text, int $format): array => ['type' => 'text', 'version' => 1, 'text' => $text, 'format' => $format, 'detail' => 0, 'mode' => 'normal', 'style' => ''];

    return ['root' => [
        'type' => 'root', 'version' => 1, 'direction' => null, 'format' => '', 'indent' => 0,
        'children' => [
            ['type' => 'paragraph', 'version' => 1, 'direction' => null, 'format' => '', 'indent' => 0, 'textFormat' => 0, 'textStyle' => '', 'children' => [
                $text('Hello ', 0), $text('world', 1), $text(' again ', 0),
            ]],
            ['type' => 'embed', 'version' => 1, 'id' => '7f1c1a52-4b8e-4f6e-9d51-2c7a0f0e2d11', 'kind' => 'callout', 'data' => $embedData],
        ],
    ]];
}

it('keeps a richtext document as posted through TrimStrings and ConvertEmptyStringsToNull', function () {
    $document = boldRunDocument(['title' => 'Fine', 'text' => 'x']);

    RichtextEmbedsPage::$submitted = null;
    $this->postJson('/admin/richtext-embeds/forms/doc', ['body' => $document])->assertRedirect();

    expect(RichtextEmbedsPage::$submitted['body'])->toBe($document);
});

it('still cleans the embed data inside the document', function () {
    $this->postJson('/admin/richtext-embeds/forms/doc', ['body' => boldRunDocument(['title' => ' Fine ', 'text' => ''])])->assertRedirect();

    expect(RichtextEmbedsPage::$submitted['body']['root']['children'][1]['data'])->toBe(['title' => 'Fine', 'text' => null])
        ->and(RichtextEmbedsPage::$submitted['body']['root']['children'][0]['children'][0]['text'])->toBe('Hello ');
});

it('restores documents under an action payload and in translatable locale maps', function () {
    $document = boldRunDocument([]);
    $request = Request::create('/', 'POST', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode(['payload' => ['form' => [
        'title' => ' Hi ', 'intro' => ['en' => $document],
    ]]]));
    $cleaned = ['title' => 'Hi', 'intro' => ['en' => json_decode(str_replace(['"Hello "', '"format":""'], ['"Hello"', '"format":null'], json_encode($document)), true)]];

    expect(RichtextInput::restore($request, $cleaned, 'payload.form'))->toBe(['title' => 'Hi', 'intro' => ['en' => $document]]);
});
