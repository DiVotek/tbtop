<?php

use App\Admin\Pages\PostsIndexPage;
use App\Models\Post;
use App\Models\User;

// The posts list exercised with the tbtop() testing API: every call goes through
// the page's real endpoints, as the React client would send it.

beforeEach(function () {
    $this->actingAs(User::factory()->create(['role' => 'admin']));
});

it('lists posts and narrows them by tab and search', function () {
    $draft = Post::factory()->create(['published' => false, 'slug' => 'draft-one', 'title' => ['en' => 'Draft about tables']]);
    $live = Post::factory()->create(['published' => true, 'slug' => 'live-one', 'title' => ['en' => 'Live about charts']]);

    $posts = tbtop(PostsIndexPage::class)->assertOk()->assertTitle('Posts')->table('posts');

    $posts->assertCanSeeRecords([$draft, $live])->assertTabCount('draft', 1);
    $posts->tab('draft')->assertCanSeeRecords($draft)->assertCanNotSeeRecords($live);
    $posts->tab('all')->search('charts')->assertCanSeeRecords($live)->assertTotal(1);
});

it('quick-creates a post in the slide-over and validates its slug', function () {
    $table = tbtop(PostsIndexPage::class)->table('posts');

    $table->callAction('quickCreate', form: ['title' => ['en' => 'Hello'], 'slug' => 'hello'])
        ->assertHasNoErrors()
        ->assertNotified('Post created')
        ->assertModalClosed()
        ->assertTableRefreshed('posts');

    $table->callAction('quickCreate', form: ['title' => ['en' => 'Again'], 'slug' => 'hello'])
        ->assertHasErrors(['slug' => 'unique:posts,slug']);

    expect(Post::query()->where('slug', 'hello')->count())->toBe(1);
});

it('opens the publication modal prefilled and saves it', function () {
    $post = Post::factory()->create(['published' => true, 'published_at' => '2026-01-15']);

    tbtop(PostsIndexPage::class)->table('posts')
        ->openRowAction('editPublication', $post)
        ->assertFormData(['published' => true])
        ->fill(['published' => false])
        ->submit()
        ->assertNotified('Publication updated');

    expect($post->fresh()->published)->toBeFalse();
});

it('deletes a row and a selection', function () {
    [$one, $two, $three] = Post::factory()->count(3)->create()->all();
    $table = tbtop(PostsIndexPage::class)->table('posts');

    $table->callRowAction('delete', $one)->assertNotified('Record deleted');
    $table->callBulkAction('delete-selected', [$two, $three])->assertNotified('Deleted 2 post(s)');

    expect(Post::query()->count())->toBe(0);
});
