<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

// End-to-end wire for UploadDemoPage's inline-config upload field. The browser
// smoke can render the dropzone but can't drive setInputFiles over the remote
// Playwright socket, so the upload round-trip + webp conversion is proven here at
// the HTTP boundary, against the demo page's own resolved field config.
class UploadDemoPageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::fake('local');
        $this->actingAs(User::factory()->create(['role' => 'admin']));
    }

    public function test_page_renders_the_admin_component(): void
    {
        $this->get('/admin/upload-demo')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('admin/page', false));
    }

    public function test_upload_stores_under_the_inline_disk_and_directory_as_webp(): void
    {
        if (! function_exists('imagewebp')) {
            $this->markTestSkipped('GD webp encoder unavailable');
        }

        $data = $this->postJson('/admin/upload-demo/uploads/doc', [
            'file' => UploadedFile::fake()->image('sample.png', 300, 200),
        ])->assertOk()->json('data');

        // Original filename is preserved; the stored object is converted to webp.
        $this->assertSame('sample.png', $data['filename']);
        $this->assertSame('image/webp', $data['mimeType']);
        $this->assertStringEndsWith('.webp', $data['url']);
        Storage::disk('public')->assertExists('docs/'.$data['id']);
    }

    public function test_private_field_stores_on_the_local_disk_as_webp(): void
    {
        if (! function_exists('imagewebp')) {
            $this->markTestSkipped('GD webp encoder unavailable');
        }

        $data = $this->postJson('/admin/upload-demo/uploads/secret', [
            'file' => UploadedFile::fake()->image('confidential.png', 300, 200),
        ])->assertOk()->json('data');

        // Stored on the private `local` disk, converted to webp — never written
        // to the public disk.
        $this->assertSame('image/webp', $data['mimeType']);
        Storage::disk('local')->assertExists('private-docs/'.$data['id']);
        Storage::disk('public')->assertMissing('private-docs/'.$data['id']);
    }

    public function test_upload_rejects_a_mime_outside_the_accept_allowlist(): void
    {
        $this->postJson('/admin/upload-demo/uploads/doc', [
            'file' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf'),
        ])->assertStatus(422);
    }

    public function test_form_submit_redirects_back_to_the_demo_page(): void
    {
        $this->postJson('/admin/upload-demo/forms/upload', [
            'doc' => ['filename' => 'sample.png', 'url' => '/storage/docs/x.webp'],
        ])->assertRedirect('/admin/upload-demo');
    }
}
