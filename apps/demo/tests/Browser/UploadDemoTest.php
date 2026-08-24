<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Route;
use Tbtop\Admin\Http\Media\MediaController;
use Tbtop\Admin\Http\Media\MediaFolderController;
use Tbtop\Admin\Media\Models\Media;

// Browser smoke for UploadDemoPage (the inline-config upload field): a real browser
// must hydrate the page and render both upload-field states without console/JS
// errors — the seeded `doc` field as its saved-value preview, and the unseeded
// `gallery` field as its empty dropzone.
//
// The file-attach round-trip is NOT driven here: pest-plugin-browser talks to
// Playwright over a WebSocket (non-local client), so setInputFiles' localPaths are
// rejected ("localPaths are not allowed when the client is not local"). The
// end-to-end upload + webp conversion through the page-scoped endpoint is covered
// at the HTTP boundary in tests/Feature/Admin/UploadDemoPageTest.php instead.

beforeEach(function () {
    $this->actingAs(User::factory()->create(['role' => 'admin']));
});

it('renders the inline-config upload dropzone', function () {
    visit('/admin/upload-demo')
        ->assertVisible('#app main')   // React-rendered admin shell content
        ->assertSee('sample.webp')     // `doc` has a seeded value: renders UploadPreview, not the input
        ->assertVisible('#gallery')    // `gallery` has no seeded value: renders UploadPicker's file input
        ->assertNoSmoke();             // no console logs + no JavaScript errors
});

function firstMediaPreviewExpr(): string
{
    return <<<'JS'
Array.from(document.querySelectorAll('[data-testid^="media-preview-"]'))
  .find((node) => /^media-preview-\d+$/.test(node.getAttribute('data-testid')))
  ?.getAttribute('data-testid')
JS;
}

function mediaPointerDragScript(string $fromId, string $toId): string
{
    return <<<JS
async () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const handle = document.querySelector('[data-testid="media-preview-drag-handle-{$fromId}"]');
  const target = document.querySelector('[data-testid="media-preview-{$toId}"]');
  const from = handle.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const sx = from.x + from.width / 2, sy = from.y + from.height / 2;
  const tx = to.x + to.width / 2, ty = to.y + to.height / 2;
  const dispatch = (type, x, y, receiver) => receiver.dispatchEvent(new PointerEvent(type, {
    bubbles: true, cancelable: true, composed: true,
    pointerId: 1, isPrimary: true, button: 0, buttons: 1,
    clientX: x, clientY: y,
  }));
  dispatch('pointerdown', sx, sy, handle);
  await sleep(20);
  for (let step = 1; step <= 8; step++) {
    dispatch('pointermove', sx + (tx - sx) * step / 8, sy + (ty - sy) * step / 8, document);
    await sleep(20);
  }
  dispatch('pointerup', tx, ty, document);
  await sleep(50);
  return true;
}
JS;
}

it('reorders selected media with pointer drag', function () {
    // Pest's in-process browser server omits package-shared Inertia props, so
    // expose the same controllers at the unprefixed fallback used in that environment.
    Route::get('/media', [MediaController::class, 'index']);
    Route::get('/media/folders', [MediaFolderController::class, 'index']);

    $first = Media::query()->create([
        'name' => 'First.jpg',
        'disk' => 'public',
        'path' => 'first.jpg',
        'mime' => 'image/jpeg',
        'size' => 10,
        'sizes' => [],
    ]);
    $second = Media::query()->create([
        'name' => 'Second.jpg',
        'disk' => 'public',
        'path' => 'second.jpg',
        'mime' => 'image/jpeg',
        'size' => 10,
        'sizes' => [],
    ]);

    $page = visit('/admin/upload-demo')
        ->click('@media-picker-choose-gallery_media_ids')
        ->click("@media-card-{$first->id}")
        ->click("@media-card-{$second->id}")
        ->click('@media-picker-confirm')
        ->assertVisible("@media-preview-drag-handle-{$first->id}")
        ->assertScript(firstMediaPreviewExpr(), "media-preview-{$first->id}");

    $page->script(mediaPointerDragScript((string) $first->id, (string) $second->id));

    $page->assertScript(firstMediaPreviewExpr(), "media-preview-{$second->id}")
        ->assertNoSmoke();

    $page->script(<<<'JS'
document
  .querySelector('[data-testid="media-picker-gallery_media_ids"]')
  .closest('form')
  .querySelector('[data-testid="action-save"]')
  .click()
JS);

    $page->assertScript(firstMediaPreviewExpr(), "media-preview-{$second->id}")
        ->assertNoSmoke();
});
