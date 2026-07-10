<?php

use Tbtop\Admin\Tests\Fixtures\TabbedFormPage;

it('collects rules and delivers values for fields nested inside a form tab', function () {
    config()->set('tbtop-admin.content_locales', ['en', 'uk']);
    config()->set('tbtop-admin.default_content_locale', 'en');

    $response = $this->post('/admin/tabbed-form/forms/post', [
        'title' => 'Updated',
        'summary' => ['en' => 'Hi again', 'uk' => 'Привіт'],
    ]);

    $response->assertRedirect();
    expect(TabbedFormPage::$submitted)->toBe([
        'title' => 'Updated',
        'summary' => ['en' => 'Hi again', 'uk' => 'Привіт'],
    ]);
});

it('rejects a missing required field nested inside a form tab', function () {
    $response = $this->from('/admin/tabbed-form')
        ->post('/admin/tabbed-form/forms/post', [
            'summary' => 'Hi',
        ]);

    $response->assertSessionHasErrors(['title']);
    expect(TabbedFormPage::$submitted)->toBeNull();
});
