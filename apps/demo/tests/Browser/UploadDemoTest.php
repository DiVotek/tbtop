<?php

declare(strict_types=1);

use App\Models\User;

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
