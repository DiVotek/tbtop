<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Tbtop\Admin\Pages\Page;

final class PageController
{
    public function show(Request $request): Response
    {
        $class = $request->route()?->parameter('tbtopPage');

        if (is_string($class) && is_subclass_of($class, Page::class)) {
            $gate = $class::can();
            if ($gate !== null) {
                Gate::authorize($gate);
            }
        }

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
