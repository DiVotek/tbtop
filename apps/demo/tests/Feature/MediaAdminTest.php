<?php

namespace Tests\Feature;

use App\Models\Media;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MediaAdminTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->actingAs(User::factory()->create(['role' => 'admin']));
    }

    public function test_media_index_renders_the_admin_page_component(): void
    {
        $this->get('/admin/media')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('admin/page', false));
    }

    public function test_media_table_rows_carry_the_camel_case_mime_type_for_the_upload_cell(): void
    {
        $this->makeMedia();

        $response = $this->getJson('/admin/media/tables/media')->assertOk();

        $this->assertSame(1, $response->json('data.total'));
        $this->assertSame('image/png', $response->json('data.data.0.mimeType'));
    }

    public function test_upload_form_submit_creates_a_media_row_from_the_upload_endpoint_payload(): void
    {
        $upload = $this->postJson('/admin/uploads/media', [
            'file' => UploadedFile::fake()->image('photo.png', 600, 400),
        ])->assertOk()->json('data');

        $this->postJson('/admin/media/new/forms/upload', ['file' => $upload])
            ->assertRedirect('/admin/media');

        $media = Media::sole();
        $this->assertSame('photo.png', $media->filename);
        $this->assertSame('image/png', $media->mime_type);
        $this->assertSame(600, $media->width);
        $this->assertSame(400, $media->height);
        $this->assertGreaterThan(0, $media->filesize);
        $this->assertSame('thumb', $media->sizes[0]['name']);
        Storage::disk('public')->assertExists('uploads/'.basename($media->url));
    }

    public function test_upload_form_submit_requires_a_file(): void
    {
        $this->postJson('/admin/media/new/forms/upload', ['file' => null])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_edit_form_submit_updates_the_alt_text(): void
    {
        $media = $this->makeMedia();

        $this->postJson("/admin/media/{$media->id}/edit/forms/media", [
            'alt' => 'A mountain',
            'file' => ['filename' => $media->filename, 'url' => $media->url],
        ])->assertRedirect();

        $this->assertSame('A mountain', $media->refresh()->alt);
    }

    public function test_edit_form_submit_replaces_the_image_with_a_fresh_upload(): void
    {
        $media = $this->makeMedia();
        $upload = $this->postJson('/admin/uploads/media', [
            'file' => UploadedFile::fake()->image('replacement.png', 300, 200),
        ])->assertOk()->json('data');

        $this->postJson("/admin/media/{$media->id}/edit/forms/media", [
            'alt' => 'New picture',
            'file' => $upload,
        ])->assertRedirect();

        $media->refresh();
        $this->assertSame('replacement.png', $media->filename);
        $this->assertSame($upload['url'], $media->url);
        $this->assertSame(300, $media->width);
        $this->assertSame('New picture', $media->alt);
    }

    public function test_edit_form_submit_keeps_file_columns_when_image_is_untouched(): void
    {
        $media = $this->makeMedia();

        $this->postJson("/admin/media/{$media->id}/edit/forms/media", [
            'alt' => 'Only alt changed',
            'file' => ['filename' => $media->filename, 'url' => $media->url],
        ])->assertRedirect();

        $media->refresh();
        $this->assertSame('Only alt changed', $media->alt);
        $this->assertSame(1234, $media->filesize);
        $this->assertSame('image/png', $media->mime_type);
    }

    public function test_row_delete_action_deletes_the_media_row(): void
    {
        $media = $this->makeMedia();

        $this->postJson('/admin/media/actions/delete', [
            'payload' => ['row' => ['id' => $media->id]],
        ])->assertOk()->assertJsonPath('effects.0.kind', 'notify');

        $this->assertDatabaseMissing('media', ['id' => $media->id]);
    }

    /** @param  array<string, mixed>  $overrides */
    private function makeMedia(array $overrides = []): Media
    {
        return Media::create([
            'filename' => 'photo.png',
            'url' => '/storage/uploads/photo.png',
            'mime_type' => 'image/png',
            'filesize' => 1234,
            'width' => 600,
            'height' => 400,
            'sizes' => [],
            ...$overrides,
        ]);
    }
}
