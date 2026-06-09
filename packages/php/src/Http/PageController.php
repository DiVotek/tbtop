<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class PageController
{
    public function show(Request $request): Response
    {
        $resolved = ResolvedPage::fromRequest($request);
        $data = [];
        foreach ($resolved->s->collectedForms() as $name => $form) {
            $data[$name] = $form->recordData();
        }

        return Inertia::render('admin/page', [
            'slug' => $resolved->page::slug(),
            'title' => $resolved->page->title(),
            'structure' => $resolved->tree,
            'data' => $data,
        ]);
    }
}
