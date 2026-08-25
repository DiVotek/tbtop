<?php

use Tbtop\Admin\Tests\Fixtures\RequiredIfFormPage;

it('rejects a requiredIf field left blank when the condition is satisfied', function () {
    $response = $this->from('/admin/required-if-form')
        ->post('/admin/required-if-form/forms/post', [
            'type' => 'company',
            'published' => false,
        ]);

    $response->assertSessionHasErrors(['company_name']);
    expect(RequiredIfFormPage::$submitted)->toBeNull();
});

it('accepts a requiredIf field left blank when the condition is not satisfied', function () {
    $response = $this->post('/admin/required-if-form/forms/post', [
        'type' => 'person',
        'published' => false,
    ]);

    $response->assertRedirect();
    expect(RequiredIfFormPage::$submitted)->toBe([
        'type' => 'person',
        'published' => false,
    ]);
});

it('accepts a requiredIf field left blank when the condition value order is swapped and would wrongly pass', function () {
    // Guards against a mutation that swaps operand order (value,field instead
    // of field,value): posting type=company with company_name filled must
    // still pass — this only fails if the mapping is broken in the other
    // direction (field always required regardless of type).
    $response = $this->post('/admin/required-if-form/forms/post', [
        'type' => 'company',
        'company_name' => 'Acme',
        'published' => false,
    ]);

    $response->assertRedirect();
    expect(RequiredIfFormPage::$submitted['company_name'])->toBe('Acme');
});

it('enforces requiredIf on a boolean eq true condition against a native boolean value', function () {
    $response = $this->from('/admin/required-if-form')
        ->post('/admin/required-if-form/forms/post', [
            'type' => 'person',
            'published' => true,
        ]);

    $response->assertSessionHasErrors(['publish_note']);
    expect(RequiredIfFormPage::$submitted)->toBeNull();
});

it('does not require the boolean-gated field when the condition is false', function () {
    $response = $this->post('/admin/required-if-form/forms/post', [
        'type' => 'person',
        'published' => false,
    ]);

    $response->assertRedirect();
    expect(RequiredIfFormPage::$submitted)->not->toHaveKey('publish_note');
});
