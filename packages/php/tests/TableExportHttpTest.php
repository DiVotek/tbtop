<?php

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Testing\TestResponse;
use Tbtop\Admin\Tests\ExportHttpTestCase;
use Tbtop\Admin\Tests\Fixtures\EcPost;

uses(ExportHttpTestCase::class);

beforeEach(function (): void {
    Gate::define('never', fn (?object $user) => false);
    Schema::create('ecposts', function ($table): void {
        $table->id();
        $table->string('title');
        $table->boolean('published')->default(false);
        $table->string('note')->default('');
        $table->string('status')->default('draft');
        $table->unsignedInteger('sort_order')->default(0);
    });
    EcPost::forceCreate(['title' => 'Bravo', 'published' => true, 'status' => 'live', 'note' => 'n1', 'sort_order' => 2]);
    EcPost::forceCreate(['title' => 'Alpha', 'published' => false, 'status' => 'draft', 'note' => 'n2', 'sort_order' => 1]);
    EcPost::forceCreate(['title' => '=HYPERLINK("x")', 'published' => true, 'status' => 'other', 'note' => '', 'sort_order' => 3]);
});

/** @return list<list<string>> */
function exportCsv(TestResponse $response): array
{
    $body = $response->streamedContent();
    expect(str_starts_with($body, "\u{FEFF}"))->toBeTrue();
    $lines = preg_split("/\r\n/", rtrim(substr($body, 3), "\r\n"));

    return array_map(fn (string $line) => str_getcsv($line, ',', '"', ''), $lines);
}

it('Export: writes the enabled columns as on screen, export() label and as() applied', function (): void {
    $response = $this->get('/admin/export-posts/tables/ecposts/export/export?format=csv&sort=title&dir=asc');

    $response->assertOk();
    expect($response->headers->get('Content-Type'))->toContain('text/csv')
        ->and($response->headers->get('Content-Disposition'))->toContain('attachment; filename=ecposts-')
        ->and($response->headers->get('Cache-Control'))->toContain('no-store');
    expect(exportCsv($response))->toBe([
        ['Title', 'Published', 'Status', 'Order'],
        ["'=HYPERLINK(\"x\")", 'Yes', 'other', 'pos-3'],
        ['Alpha', 'No', 'Draft', 'pos-1'],
        ['Bravo', 'Yes', 'Live', 'pos-2'],
    ]);
});

it('Export: columns[] picks the columns, a disabled one included, in declared order', function (): void {
    $response = $this->get('/admin/export-posts/tables/ecposts/export/export?format=csv&sort=title&dir=asc&columns[]=note&columns[]=title&columns[]=nope');

    expect(exportCsv($response))->toBe([
        ['Title', 'Notes'],
        ["'=HYPERLINK(\"x\")", ''],
        ['Alpha', 'n2'],
        ['Bravo', 'n1'],
    ]);
});

it('Export: no known column in columns[] is a 422', function (): void {
    $this->get('/admin/export-posts/tables/ecposts/export/export?format=csv&columns[]=nope')
        ->assertStatus(422);
});

it('Export: filters and search narrow the file like the table', function (): void {
    $filtered = exportCsv($this->get('/admin/export-posts/tables/ecposts/export/export?format=csv&filters[published]=0&columns[]=title'));
    $searched = exportCsv($this->get('/admin/export-posts/tables/ecposts/export/export?format=csv&search=brav&columns[]=title'));

    expect($filtered)->toBe([['Title'], ['Alpha']])
        ->and($searched)->toBe([['Title'], ['Bravo']]);
});

it('Export: ids[] exports the selection, and only inside the table scope', function (): void {
    $alpha = EcPost::where('title', 'Alpha')->value('id');
    $bravo = EcPost::where('title', 'Bravo')->value('id');

    $picked = $this->get("/admin/export-posts/tables/ecposts/export/exportPicked?ids[]={$alpha}&columns[]=title");
    $scoped = $this->get("/admin/export-posts/tables/ecposts_published/export/exportPublished?format=csv&ids[]={$alpha}&ids[]={$bravo}");

    expect($picked->headers->get('Content-Disposition'))->toContain('filename=picked.csv')
        ->and(exportCsv($picked))->toBe([['Title'], ['Alpha']])
        ->and(exportCsv($scoped))->toBe([['Title'], ['Bravo']]);
});

it('Export: a nested ids[] value is a validation error', function (): void {
    $this->get('/admin/export-posts/tables/ecposts/export/export?format=csv&ids[0][]=1')
        ->assertStatus(302);
});

it('Export: over maxRows is refused with a readable 422 before streaming', function (): void {
    $response = $this->getJson('/admin/export-posts/tables/ecposts/export/exportSmall?format=csv');

    $response->assertStatus(422);
    expect($response->json('message'))->toContain('3 rows')->toContain('2');
});

it('Export: a format the action does not offer is a 422', function (): void {
    $this->getJson('/admin/export-posts/tables/ecposts/export/exportPicked?format=xlsx')->assertStatus(422);
    $this->getJson('/admin/export-posts/tables/ecposts/export/export?format=pdf')->assertStatus(422);
});

it('Export: an unauthorized, foreign or non-export action is a 404', function (string $url): void {
    $this->getJson($url)->assertNotFound();
})->with([
    'authorize() denies' => '/admin/export-posts/tables/ecposts/export/exportGated?format=csv',
    'action of another table' => '/admin/export-posts/tables/ecposts_published/export/export?format=csv',
    'unknown action' => '/admin/export-posts/tables/ecposts/export/nope?format=csv',
    'unknown table' => '/admin/export-posts/tables/nope/export/export?format=csv',
]);

it('Export: a query-builder table streams its rows', function (): void {
    $rows = exportCsv($this->get('/admin/export-posts/tables/plain_posts/export/exportPlain?format=csv'));

    expect($rows)->toBe([['Title'], ['Bravo'], ['Alpha'], ["'=HYPERLINK(\"x\")"]]);
});

it('Export: XLSX is a valid zip holding the same cells as the CSV', function (): void {
    $response = $this->get('/admin/export-posts/tables/ecposts/export/export?format=xlsx&sort=title&dir=asc');

    $response->assertOk();
    expect($response->headers->get('Content-Type'))->toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    $path = tempnam(sys_get_temp_dir(), 'xlsx');
    file_put_contents($path, $response->streamedContent());
    $zip = new ZipArchive;
    expect($zip->open($path, ZipArchive::CHECKCONS))->toBeTrue();
    $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');
    expect($zip->getFromName('[Content_Types].xml'))->toContain('worksheet+xml');
    $zip->close();
    unlink($path);

    $xml = simplexml_load_string($sheet);
    $rows = [];
    foreach ($xml->sheetData->row as $row) {
        $rows[] = array_map(fn ($c) => (string) ($c->is->t ?? $c->v), iterator_to_array($row->c, false));
    }
    expect($rows)->toBe([
        ['Title', 'Published', 'Status', 'Order'],
        ['=HYPERLINK("x")', 'Yes', 'other', 'pos-3'],
        ['Alpha', 'No', 'Draft', 'pos-1'],
        ['Bravo', 'Yes', 'Live', 'pos-2'],
    ]);
});
