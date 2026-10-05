<?php

use Tbtop\Admin\Tests\Fixtures\McpPage;
use Tbtop\Admin\Tests\McpHttpTestCase;

uses(McpHttpTestCase::class);

function lexicalText(string $text): array
{
    return ['type' => 'text', 'version' => 1, 'text' => $text, 'format' => 0, 'detail' => 0, 'mode' => 'normal', 'style' => ''];
}

function lexicalElement(string $type, array $children, array $extra = []): array
{
    return ['type' => $type, 'version' => 1, 'children' => $children, 'format' => '', 'indent' => 0, 'direction' => null, ...$extra];
}

function lexicalDocument(array $children): array
{
    return ['root' => lexicalElement('root', $children)];
}

it('richtext over MCP accepts editor nodes, a declared embed and a document inside a repeater row', function (): void {
    $search = $this->toolResult($this->callTool('search', ['page' => 'mcp-content-page']))['json'];
    $body = collect($search['executables'][0]['fields'])->firstWhere('name', 'body');
    expect($body['embeds'][0])->toMatchArray(['kind' => 'pullQuote', 'label' => 'Pull quote'])
        ->and($body['embeds'][0]['fields'][0])->toMatchArray(['name' => 'author', 'rules' => ['required']]);

    $tab = [...lexicalText("\t"), 'type' => 'tab'];
    $form = [
        'body' => ['en' => lexicalDocument([
            lexicalElement('paragraph', [lexicalText('Lead'), $tab, ['type' => 'linebreak', 'version' => 1]]),
            ['type' => 'embed', 'version' => 1, 'id' => 'q1', 'kind' => 'pullQuote', 'data' => ['author' => 'Ada']],
        ])],
        'sections' => [['heading' => 'Intro', 'content' => lexicalDocument([
            lexicalElement('list', [lexicalElement('listitem', [lexicalText('One')], ['value' => 1])], ['listType' => 'bullet', 'start' => 1]),
        ])]],
    ];
    $result = $this->toolResult($this->callTool('execute', ['id' => 'mcp-content-page:post', 'form' => $form]));

    expect($result['isError'])->toBeFalse()
        ->and(McpPage::$ran['post']['body'])->toBe($form['body']);
});

it('refuses a richtext document the editor could not open, before the handler runs', function (array $form, string $message): void {
    $result = $this->toolResult($this->callTool('execute', ['id' => 'mcp-content-page:post', 'form' => $form]));

    expect($result['isError'])->toBeTrue()
        ->and($result['json']['message'])->toBe($message)
        ->and(McpPage::$ran)->not->toHaveKey('post');
})->with([
    'unknown node deep inside a repeater row' => [
        ['sections' => [['content' => lexicalDocument([lexicalElement('paragraph', [['type' => 'table', 'version' => 1]])])]]],
        'sections.0.content: unknown richtext node "table" at root.children[0].children[0]; allowed: paragraph, text, linebreak, tab, heading, quote, list, listitem, code, code-highlight, link, autolink, embed.',
    ],
    'html string' => [
        ['body' => ['en' => '<p>Lead</p>']],
        'body.en: richtext must be a Lexical editor state {root: {...}}.',
    ],
    'node missing a key Lexical reads' => [
        ['body' => ['en' => lexicalDocument([lexicalElement('heading', [lexicalText('Title')])])]],
        'body.en: richtext node "heading" at root.children[0] needs tag.',
    ],
]);

it('an excluded child of a repeater is listed and refused', function (): void {
    $form = $this->toolResult($this->callTool('search', ['page' => 'mcp-content-page']))['json']['executables'][0];
    expect(array_column($form['fields'], 'name'))->toBe(['body', 'sections', 'sections.*.heading', 'sections.*.content'])
        ->and($form['excludedFields'])->toBe([['name' => 'sections.*.image', 'kind' => 'upload', 'reason' => 'upload fields cannot be filled over MCP']]);

    $echo = $this->toolResult($this->callTool('execute', ['id' => 'mcp-content-page:post', 'form' => [
        'sections' => [['heading' => 'Renamed', 'image' => 'intro.png', 'content' => null]],
    ]]));
    expect($echo['isError'])->toBeFalse()
        ->and(McpPage::$ran['post']['sections'][0]['heading'])->toBe('Renamed');

    McpPage::$ran = [];
    $changed = $this->toolResult($this->callTool('execute', ['id' => 'mcp-content-page:post', 'form' => [
        'sections' => [['heading' => 'Intro', 'image' => 'intro.png'], ['heading' => 'More', 'image' => 'agent.png']],
    ]]));
    expect($changed['json']['message'])
        ->toBe('Fields listed in excludedFields cannot be changed over MCP; omit them or send their current value: sections.1.image.')
        ->and(McpPage::$ran)->not->toHaveKey('post');

    $coerced = $this->toolResult($this->callTool('execute', ['id' => 'mcp-content-page:post', 'form' => [
        'sections' => [['heading' => 'Intro', 'image' => true]],
    ]]));
    expect($coerced['json']['message'])
        ->toBe('Fields listed in excludedFields cannot be changed over MCP; omit them or send their current value: sections.0.image.')
        ->and(McpPage::$ran)->not->toHaveKey('post');
});
