<?php

it('shows the field label instead of the raw name in a validation error message', function () {
    $response = $this->from('/admin/posts/1/edit')
        ->post('/admin/posts/1/edit/forms/post', [
            'sections' => [['body' => 'no heading']],
        ]);

    $errors = session('errors');
    expect($errors->get('title')[0])->toContain('Title')
        ->and($errors->get('title')[0])->not->toContain('title field');
});
