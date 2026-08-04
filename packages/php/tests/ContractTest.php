<?php

use Opis\JsonSchema\Errors\ErrorFormatter;
use Opis\JsonSchema\Validator;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Navigation\NavBuilder;
use Tbtop\Admin\Navigation\NavItem;
use Tbtop\Admin\Panels\ChromeSerializer;
use Tbtop\Admin\Panels\CurrentPanel;
use Tbtop\Admin\Panels\PanelConfig;
use Tbtop\Admin\Tests\Fixtures\Chromes\LocaleSwitcherChrome;
use Tbtop\Admin\Tests\Fixtures\KitchenSinkPage;
use Tbtop\Admin\Tests\Fixtures\NavChildPage;
use Tbtop\Admin\Tests\Fixtures\NavParentPage;

const SCHEMA_PATH = __DIR__.'/../../contracts/structure.schema.json';
const FIXTURE_PATH = __DIR__.'/../../contracts/fixtures/kitchen-sink.json';

function validateAgainstSchema(mixed $data, string $pointer = ''): void
{
    $validator = new Validator;
    $schema = json_decode((string) file_get_contents(SCHEMA_PATH));
    $validator->resolver()?->registerRaw($schema);
    $result = $validator->validate($data, $schema->{'$id'}.$pointer);
    $error = $result->error();

    expect($result->isValid())->toBeTrue(
        $error ? json_encode((new ErrorFormatter)->format($error)) : '',
    );
}

it('kitchen-sink page serialization conforms to the wire grammar schema', function () {
    $s = new S;
    $tree = (new KitchenSinkPage)->view($s);
    $json = json_decode(json_encode($tree));

    validateAgainstSchema($json);
});

it('kitchen-sink serialization matches the committed fixture snapshot', function () {
    $s = new S;
    $tree = (new KitchenSinkPage)->view($s);
    $current = json_encode($tree, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

    if (! file_exists(FIXTURE_PATH) || getenv('UPDATE_FIXTURES')) {
        @mkdir(dirname(FIXTURE_PATH), 0755, true);
        file_put_contents(FIXTURE_PATH, $current."\n");
    }

    expect($current."\n")->toBe((string) file_get_contents(FIXTURE_PATH));
});

it('default chrome serialization conforms to the chrome contract', function () {
    $chrome = ChromeSerializer::forPanel(panelWithPages([]));

    validateAgainstSchema(json_decode(json_encode($chrome)), '#/$defs/chrome');
});

it('chrome with a dropdown-variant locale switcher conforms to the chrome contract', function () {
    $chrome = ChromeSerializer::forPanel(panelWithChrome(LocaleSwitcherChrome::class));

    validateAgainstSchema(json_decode(json_encode($chrome)), '#/$defs/chrome');
});

it('chrome with a default (buttons) locale switcher conforms to the chrome contract', function () {
    $s = new S;
    $node = $s->localeSwitcher();

    validateAgainstSchema(json_decode(json_encode($node)));
});

it('userMenu with the locales option conforms to the chrome contract', function () {
    $s = new S;
    $node = $s->userMenu(['locales' => false]);

    validateAgainstSchema(json_decode(json_encode($node)));
});

it('effects serialization conforms to the effects schema', function () {
    $effects = Effects::make()
        ->notify('Saved')
        ->notify('Careful', 'warning')
        ->redirect('/admin/posts')
        ->refreshTable('posts')
        ->resetForm()
        ->closeModal();

    validateAgainstSchema(json_decode(json_encode($effects)), '#/$defs/effects');
});

it('copyable and mask options conform to the wire grammar schema', function () {
    $s = new S;

    $form = $s->form('contact', [
        $s->text('phone')->mask('(999) 999-9999')->copyable('Phone copied!', 1500),
    ]);
    validateAgainstSchema(json_decode(json_encode($form)));

    $display = $s->displayValue('TT-1042')->copyable();
    validateAgainstSchema(json_decode(json_encode($display)));

    validateAgainstSchema(
        json_decode(json_encode([Column::make('slug')->copyable('Slug copied!')])),
        '#/$defs/columns'
    );
});

it('table embedded option conforms to the wire grammar schema', function () {
    $s = new S;
    $table = $s->table('posts')
        ->columns(['title' => 'Title'])
        ->embedded()
        ->query(fn () => null)
        ->toNode();

    validateAgainstSchema(json_decode(json_encode($table)));
});

it('section action option conforms to the wire grammar schema', function () {
    $s = new S;
    $node = $s->section(
        ['title' => 'Recently updated pages', 'action' => ['label' => 'Open pages', 'url' => '/admin/pages']],
        [$s->displayText('...')]
    );

    validateAgainstSchema(json_decode(json_encode($node)));
});

it('list node conforms to the wire grammar schema', function () {
    $s = new S;
    $node = $s->list('recent')->items(fn () => [
        ['title' => 'Home', 'meta' => '2 min ago', 'color' => 'success', 'url' => '/admin/pages/1'],
        ['title' => 'About'],
    ]);

    validateAgainstSchema(json_decode(json_encode($node)));
});

it('section card and plain variants conform to the wire grammar schema', function () {
    $s = new S;
    $card = $s->section(
        ['title' => 'Recently updated', 'variant' => 'card', 'action' => ['label' => 'Open', 'url' => '/x']],
        [$s->displayText('...')]
    );
    $plain = $s->section(['title' => 'Browse', 'variant' => 'plain'], [$s->displayText('...')]);

    validateAgainstSchema(json_decode(json_encode($card)));
    validateAgainstSchema(json_decode(json_encode($plain)));
});

it('actionsRow grid variant conforms to the wire grammar schema', function () {
    $s = new S;
    $node = $s->actionsRow(
        [$s->action('pages')->label('Pages')->visit('/admin/pages')],
        ['variant' => 'grid']
    );

    validateAgainstSchema(json_decode(json_encode($node)));
});

it('stat with poll, colored description, trend, and sparkline color conforms to the wire grammar schema', function () {
    $s = new S;
    $stat = $s->stat('Active users')
        ->value(fn () => 42)
        ->description('online now', 'success')
        ->trend('up')
        ->sparkline([1, 2, 3], 'bottom')
        ->sparklineColor('success')
        ->poll(10);

    validateAgainstSchema(json_decode(json_encode($stat)));
});

it('chart with poll conforms to the wire grammar schema', function () {
    $s = new S;
    $chart = $s->chart('load', 'line')->query(fn () => [])->poll(15);

    validateAgainstSchema(json_decode(json_encode($chart)));
});

it('nested nav tree with a merged custom item conforms to the nav contract', function () {
    $panel = new CurrentPanel(
        (new PanelConfig)
            ->id('admin')
            ->prefix('admin')
            ->pages([NavParentPage::class, NavChildPage::class])
            ->navigationItems([
                NavItem::make('Documentation')->url('https://example.test')->icon('globe')
                    ->group('Content')->sort(5)->newTab(),
            ])
    );

    validateAgainstSchema(json_decode(json_encode(NavBuilder::build($panel))), '#/$defs/nav');
});

it('userMenuItems serialization conforms to the nav contract', function () {
    $panel = new CurrentPanel(
        (new PanelConfig)->userMenuItems([
            NavItem::make('API Tokens')->url('/admin/api-tokens')->icon('key'),
        ])
    );

    validateAgainstSchema(json_decode(json_encode($panel->userMenuItems())), '#/$defs/userMenuItems');
});
