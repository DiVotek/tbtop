<?php

it('shared tbtop props contain apiBase derived from the admin prefix', function () {
    $response = $this->get('/admin/posts/1/edit', ['X-Inertia' => 'true']);

    $response->assertOk();
    $tbtop = $response->json('props.tbtop');
    expect($tbtop)->toHaveKey('apiBase')
        ->and($tbtop['apiBase'])->toBe('/admin/api');
});
