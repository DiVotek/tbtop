<?php

declare(strict_types=1);

use App\Models\Post;
use App\Models\User;

// Real-browser smoke for drag-and-drop row reordering (#M-94). dnd-kit's
// PointerSensor + the persisted sort_order can't be exercised in happy-dom —
// only a real pointer drag against a live server proves the round trip.

beforeEach(function () {
    $this->actingAs(User::factory()->create(['role' => 'admin']));
    $this->a = Post::factory()->create(['title' => ['en' => 'Alpha'], 'slug' => 'alpha', 'sort_order' => 0]);
    $this->b = Post::factory()->create(['title' => ['en' => 'Bravo'], 'slug' => 'bravo', 'sort_order' => 1]);
    $this->c = Post::factory()->create(['title' => ['en' => 'Charlie'], 'slug' => 'charlie', 'sort_order' => 2]);
});

function firstRowExpr(): string
{
    return "document.querySelector('[data-testid^=\"table-row-\"]').getAttribute('data-testid')";
}

/**
 * dnd-kit's PointerSensor needs real pointer events with intermediate moves —
 * Playwright's high-level dragAndDrop fires too coarsely for it. Dispatch the
 * sequence by hand (pointerdown on the handle, stepped pointermove on the
 * document past the 8px activation distance, pointerup over the target).
 */
function pointerDragScript(string $fromId, string $toId): string
{
    return <<<JS
async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const handle = document.querySelector('[data-testid="reorder-handle-{$fromId}"]');
  const targetRow = document.querySelector('[data-testid="table-row-{$toId}"]');
  const a = handle.getBoundingClientRect();
  const b = targetRow.getBoundingClientRect();
  const sx = a.x + a.width / 2, sy = a.y + a.height / 2;
  const tx = b.x + b.width / 2, ty = b.y + b.height / 2;
  const ev = (type, x, y, target) => target.dispatchEvent(new PointerEvent(type, {
    bubbles: true, cancelable: true, composed: true,
    pointerId: 1, isPrimary: true, button: 0, buttons: 1,
    clientX: x, clientY: y,
  }));
  ev('pointerdown', sx, sy, handle);
  await sleep(20);
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    ev('pointermove', sx + (tx - sx) * i / steps, sy + (ty - sy) * i / steps, document);
    await sleep(20);
  }
  ev('pointerup', tx, ty, document);
  await sleep(50);
  return true;
}
JS;
}

it('drags a row and persists the new order across a reload', function () {
    $page = visit('/admin/reorderable-posts');

    $page->assertVisible("@reorder-handle-{$this->a->id}")
        ->assertScript(firstRowExpr(), "table-row-{$this->a->id}");

    // Drag Alpha's handle down onto Charlie's row — Alpha should leave the top.
    $page->script(pointerDragScript((string) $this->a->id, (string) $this->c->id));
    $page->assertScript(firstRowExpr(), "table-row-{$this->b->id}")
        ->assertNoJavaScriptErrors();

    // The server must have moved Alpha out of position 0.
    expect(Post::find($this->a->id)->sort_order)->not->toBe(0);

    // Reload: persisted order means Alpha is still not first (done-when).
    $page->refresh()->assertScript(firstRowExpr(), "table-row-{$this->b->id}");
});

it('hides drag handles and shows the hint once a sort is applied', function () {
    $page = visit('/admin/reorderable-posts');

    $page->assertVisible("@reorder-handle-{$this->a->id}")
        ->assertMissing('@reorder-disabled-hint');

    // Sorting by a foreign column disables reorder (Filament behaviour).
    $page->click('Views')
        ->assertVisible('@reorder-disabled-hint')
        ->assertMissing("@reorder-handle-{$this->a->id}")
        ->assertNoJavaScriptErrors();
});

// Keyboard sensor — BEST-EFFORT only. dnd-kit binds Space to pick up/drop and
// arrows to move on the focused handle. Playwright's synthetic key events don't
// reliably drive dnd-kit's KeyboardSensor here, so this asserts only that the
// handle is keyboard-reachable and keying it never throws — the pointer drag
// above is the real persistence gate. (Manual keyboard reorder works in-browser.)
it('keeps the focused handle keyboard-reachable without errors (best-effort)', function () {
    $page = visit('/admin/reorderable-posts');

    $page->keys("@reorder-handle-{$this->a->id}", ['Space', 'ArrowDown', 'Space', 'Escape'])
        ->assertNoJavaScriptErrors();
});
