<?php

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tbtop\Admin\Dsl\Fields\MediaPicker;
use Tbtop\Admin\Dsl\Fields\Upload;
use Tbtop\Admin\Mcp\RemoteFiles;
use Tbtop\Admin\Media\Models\Media;
use Tbtop\Admin\Panels\CurrentPanel;
use Tbtop\Admin\Tests\Fixtures\McpPage;
use Tbtop\Admin\Tests\McpHttpTestCase;

uses(McpHttpTestCase::class);

const MCP_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

beforeEach(function (): void {
    Storage::fake('public');
    // 8.8.8.8 is a public literal: SsrfGuard lets it through, Http::fake answers it.
    Http::fake(['*' => fn () => Http::response(base64_decode(MCP_PNG), 200, ['Content-Type' => 'image/png'])]);
});

it('stores an upload sent as {url} and hands the handler its path', function (string $id): void {
    $result = $this->toolResult($this->callTool('execute', ['id' => $id, 'form' => [
        'name' => 'Ada',
        'avatar' => ['url' => 'https://8.8.8.8/ada.png'],
    ]]));

    $tool = $id === 'mcp-page:main' ? 'main' : 'save';
    $path = McpPage::$ran[$tool]['avatar'] ?? null;
    expect($result['isError'])->toBeFalse()
        ->and($path)->toBeString()
        ->and(Storage::disk('public')->exists($path))->toBeTrue();
})->with([
    'onSubmit form' => 'mcp-page:main',
    'action with needs form' => 'mcp-page:save',
]);

it('refuses a {url} the SSRF guard blocks, naming the field, and runs nothing', function (): void {
    $result = $this->toolResult($this->callTool('execute', ['id' => 'mcp-page:main', 'form' => [
        'name' => 'Ada',
        'avatar' => ['url' => 'http://127.0.0.1/secret.png'],
    ]]));

    expect($result['isError'])->toBeTrue()
        ->and($result['json']['message'])->toStartWith('avatar: ')
        ->and($result['json']['message'])->toContain('not allowed')
        ->and(McpPage::$ran)->toBe([]);
});

it('imports media sent as {url} into the library when the media gate allows it', function (): void {
    McpHttpTestCase::$mediaAllowed = true;
    $page = $this->toolResult($this->callTool('search', ['page' => 'mcp-edges-page']))['json'];

    $photo = $this->toolResult($this->callTool('execute', ['id' => 'mcp-edges-page:photo', 'form' => [
        'caption' => 'Lisbon',
        'file' => ['url' => 'https://8.8.8.8/lisbon.png', 'alt' => 'Tram 28'],
    ]]));
    $gallery = $this->toolResult($this->callTool('execute', ['id' => 'mcp-edges-page:gallery', 'form' => [
        'heading' => 'Trip',
        'images' => [['url' => 'https://8.8.8.8/a.png'], ['url' => 'https://8.8.8.8/b.png']],
    ]]));

    expect(array_column($page['executables'], 'id'))->toContain('mcp-edges-page:photo', 'mcp-edges-page:gallery')
        ->and($photo['isError'])->toBeFalse()
        ->and($gallery['isError'])->toBeFalse()
        ->and(Media::query()->count())->toBe(3)
        ->and(Media::query()->find(McpPage::$ran['photo']['file'])?->alt)->toBe('Tram 28')
        ->and(McpPage::$ran['gallery']['images'])->toHaveCount(2);
});

it('keeps a closed media library closed: a media {url} is refused and nothing is imported', function (): void {
    $result = $this->toolResult($this->callTool('execute', ['id' => 'mcp-edges-page:retouch', 'form' => [
        'alt' => 'x',
        'original' => ['url' => 'https://8.8.8.8/x.png'],
    ]]));

    expect($result['isError'])->toBeTrue()
        ->and(Media::query()->count())->toBe(0)
        ->and(McpPage::$ran)->toBe([]);
});

it('takes a {url} in a new repeater row beside a stored row echoed whole', function (): void {
    McpHttpTestCase::$mediaAllowed = true;

    $result = $this->toolResult($this->callTool('execute', ['id' => 'mcp-content-page:post', 'form' => [
        'sections' => [
            ['heading' => 'Intro', 'image' => 'intro.png', 'content' => null],
            ['heading' => 'More', 'image' => ['url' => 'https://8.8.8.8/more.png']],
        ],
    ]]));
    $swapped = $this->toolResult($this->callTool('execute', ['id' => 'mcp-content-page:post', 'form' => [
        'sections' => [['heading' => 'Intro', 'image' => 'other.png', 'content' => null]],
    ]]));

    $sections = McpPage::$ran['post']['sections'] ?? [];
    expect($result['isError'])->toBeFalse()
        ->and($sections[0]['image'] ?? null)->toBe('intro.png')
        ->and(Media::query()->whereKey($sections[1]['image'] ?? 0)->exists())->toBeTrue()
        ->and($swapped['isError'])->toBeTrue();
});

it('refuses media {url} when no panel is bound, even with the gate open', function (): void {
    McpHttpTestCase::$mediaAllowed = true;
    app()->forgetInstance(CurrentPanel::class);

    expect(RemoteFiles::accepts(MediaPicker::make('logo')))->toBeFalse()
        ->and(RemoteFiles::accepts(Upload::make('cover')))->toBeTrue();
});
