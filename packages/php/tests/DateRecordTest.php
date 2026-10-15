<?php

use Illuminate\Support\Carbon;
use Tbtop\Admin\Dsl\S;

it('cuts the ISO instant Eloquent serializes for a date field down to its day', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->section([], [$s->date('published_at')]),
        $s->date('starts_on'),
        $s->date('ends_on'),
        $s->date('empty'),
    ])->record([
        'published_at' => '2026-10-15T09:00:00.000000Z',
        'starts_on' => Carbon::parse('2026-10-16 23:30:00'),
        'ends_on' => '2026-10-17',
        'empty' => null,
    ]);

    expect($form->recordData())->toBe([
        'published_at' => '2026-10-15',
        'starts_on' => '2026-10-16',
        'ends_on' => '2026-10-17',
        'empty' => null,
    ]);
});

it('reads the instant in the app timezone, so a local midnight keeps its day', function () {
    $previous = date_default_timezone_get();
    date_default_timezone_set('Europe/Kyiv');

    try {
        $s = new S;
        // A `date` cast at Kyiv midnight on 2026-10-15 serializes as the previous day in UTC.
        $form = $s->form('post', [$s->date('due_on'), $s->date('due_obj')])->record([
            'due_on' => '2026-10-14T21:00:00.000000Z',
            'due_obj' => new DateTimeImmutable('2026-10-14 21:00:00', new DateTimeZone('UTC')),
        ]);

        expect($form->recordData())->toBe(['due_on' => '2026-10-15', 'due_obj' => '2026-10-15']);
    } finally {
        date_default_timezone_set($previous);
    }
});

it('leaves datetime fields and values that are not an instant alone', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->datetime('sent_at'),
        $s->date('garbage'),
    ])->record([
        'sent_at' => '2026-10-15T09:00:00.000000Z',
        'garbage' => 'next tuesday',
    ]);

    expect($form->recordData())->toBe([
        'sent_at' => '2026-10-15T09:00:00.000000Z',
        'garbage' => 'next tuesday',
    ]);
});
