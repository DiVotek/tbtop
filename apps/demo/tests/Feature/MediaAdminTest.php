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

    public function test_upload_form_submit_creates_a_media_row_from_the_stored_path(): void
    {
        // The upload field now emits a bare storage path string; the page
        // derives the media columns from the file on disk, not from the value.
        $upload = $this->postJson('/admin/uploads/media', [
            'file' => UploadedFile::fake()->image('photo.png', 600, 400),
        ])->assertOk()->json('data');

        $this->postJson('/admin/media/new/forms/upload', ['file' => $upload['path']])
            ->assertRedirect('/admin/media');

        $media = Media::sole();
        // The path carries a hashed storage name, not the original client name —
        // the page derives the filename from the path's basename.
        $this->assertSame(basename($upload['path']), $media->filename);
        $this->assertSame('image/png', $media->mime_type);
        $this->assertSame(600, $media->width);
        $this->assertSame(400, $media->height);
        $this->assertGreaterThan(0, $media->filesize);
        // Resized variants are not recoverable from a bare path; sizes drops to [].
        $this->assertSame([], $media->sizes);
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

        // Image untouched: the field's value is the path derived from the stored
        // url (/storage/uploads/photo.png -> uploads/photo.png), resubmitted as-is.
        $this->postJson("/admin/media/{$media->id}/edit/forms/media", [
            'alt' => 'A mountain',
            'file' => $this->pathFromUrl($media->url),
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
            'file' => $upload['path'],
        ])->assertRedirect();

        $media->refresh();
        // Filename is the path basename (hashed name), derived on submit.
        $this->assertSame(basename($upload['path']), $media->filename);
        $this->assertSame(300, $media->width);
        $this->assertSame(200, $media->height);
        $this->assertSame('New picture', $media->alt);
        Storage::disk('public')->assertExists($upload['path']);
    }

    public function test_edit_form_submit_keeps_file_columns_when_image_is_untouched(): void
    {
        $media = $this->makeMedia();

        // Same path back in = image untouched: dimension columns must survive.
        $this->postJson("/admin/media/{$media->id}/edit/forms/media", [
            'alt' => 'Only alt changed',
            'file' => $this->pathFromUrl($media->url),
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

    /** Mirror the page's url-derived path: strip the /storage/ prefix. */
    private function pathFromUrl(string $url): string
    {
        return str_starts_with($url, '/storage/')
            ? substr($url, strlen('/storage/'))
            : $url;
    }
}
