<?php

use Opis\JsonSchema\Validator;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Tests\Fixtures\KitchenSinkPage;

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
        $error ? json_encode((new Opis\JsonSchema\Errors\ErrorFormatter)->format($error)) : '',
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
